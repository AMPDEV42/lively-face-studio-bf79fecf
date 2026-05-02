ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity_tts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_product_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_product_type_check
  CHECK (product_type IN ('pro_monthly','topup_messages','topup_tts','topup_bundle'));

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
  IF o.status = 'paid' THEN RETURN; END IF;

  IF o.product_type = 'pro_monthly' THEN
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
      SET topup_messages = public.usage_log.topup_messages + EXCLUDED.topup_messages, updated_at = now();

  ELSIF o.product_type = 'topup_tts' THEN
    INSERT INTO public.usage_log (user_id, period, topup_tts_chars)
    VALUES (o.user_id, period_now, o.quantity)
    ON CONFLICT (user_id, period) DO UPDATE
      SET topup_tts_chars = public.usage_log.topup_tts_chars + EXCLUDED.topup_tts_chars, updated_at = now();

  ELSIF o.product_type = 'topup_bundle' THEN
    INSERT INTO public.usage_log (user_id, period, topup_messages, topup_tts_chars)
    VALUES (o.user_id, period_now, o.quantity, o.quantity_tts)
    ON CONFLICT (user_id, period) DO UPDATE
      SET topup_messages = public.usage_log.topup_messages + EXCLUDED.topup_messages,
          topup_tts_chars = public.usage_log.topup_tts_chars + EXCLUDED.topup_tts_chars,
          updated_at = now();
  END IF;

  UPDATE public.orders SET status = 'paid', paid_at = COALESCE(paid_at, now()) WHERE order_id = _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_order(TEXT) FROM PUBLIC, anon, authenticated;