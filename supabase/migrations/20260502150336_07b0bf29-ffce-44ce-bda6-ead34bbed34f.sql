-- Orders table for Midtrans payments
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  product_type TEXT NOT NULL CHECK (product_type IN ('pro_monthly', 'topup_messages', 'topup_tts')),
  amount_idr INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired','refunded','cancelled')),
  payment_type TEXT,
  transaction_id TEXT,
  fraud_status TEXT,
  raw_notification JSONB,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- No insert/update/delete for users; only service role (edge functions) writes.

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pro subscription expiry (simple: store on profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ;

-- Atomic fulfillment RPC (callable only with service role since profiles/user_roles writes go through it)
CREATE OR REPLACE FUNCTION public.fulfill_order(_order_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  period_now TEXT := public.current_period();
BEGIN
  SELECT * INTO o FROM public.orders WHERE order_id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF o.status = 'paid' THEN RETURN; END IF; -- idempotent

  IF o.product_type = 'pro_monthly' THEN
    -- Grant pro role + extend pro_until by 30 days
    INSERT INTO public.user_roles (user_id, role)
    VALUES (o.user_id, 'pro')
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.profiles
       SET pro_until = GREATEST(COALESCE(pro_until, now()), now()) + INTERVAL '30 days'
     WHERE user_id = o.user_id;

  ELSIF o.product_type = 'topup_messages' THEN
    INSERT INTO public.usage_log (user_id, period, topup_messages)
    VALUES (o.user_id, period_now, o.quantity)
    ON CONFLICT (user_id, period) DO UPDATE
      SET topup_messages = public.usage_log.topup_messages + EXCLUDED.topup_messages,
          updated_at = now();

  ELSIF o.product_type = 'topup_tts' THEN
    INSERT INTO public.usage_log (user_id, period, topup_tts_chars)
    VALUES (o.user_id, period_now, o.quantity)
    ON CONFLICT (user_id, period) DO UPDATE
      SET topup_tts_chars = public.usage_log.topup_tts_chars + EXCLUDED.topup_tts_chars,
          updated_at = now();
  END IF;

  UPDATE public.orders
     SET status = 'paid', paid_at = COALESCE(paid_at, now())
   WHERE order_id = _order_id;
END;
$$;

-- Ensure usage_log has a unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_log_user_period_key'
  ) THEN
    ALTER TABLE public.usage_log ADD CONSTRAINT usage_log_user_period_key UNIQUE (user_id, period);
  END IF;
END$$;