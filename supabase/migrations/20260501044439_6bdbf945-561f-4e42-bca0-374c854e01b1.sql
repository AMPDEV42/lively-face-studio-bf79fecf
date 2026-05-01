-- ============================================================================
-- usage_log table — server-side source of truth untuk kuota bulanan
-- ============================================================================
CREATE TABLE public.usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period TEXT NOT NULL, -- "YYYY-MM"
  messages_count INTEGER NOT NULL DEFAULT 0,
  tokens_count INTEGER NOT NULL DEFAULT 0,
  tts_chars_count INTEGER NOT NULL DEFAULT 0,
  topup_messages INTEGER NOT NULL DEFAULT 0,
  topup_tts_chars INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);

CREATE INDEX idx_usage_log_user_period ON public.usage_log(user_id, period);

ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;

-- User can read own usage; only service role (edge functions) can write
CREATE POLICY "Users can view their own usage"
  ON public.usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_usage_log_updated_at
  BEFORE UPDATE ON public.usage_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Helper: get current month period string
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_period()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
$$;

-- ============================================================================
-- Trigger: enforce VRM upload limit by plan
-- Free  = 0 uploads
-- Pro   = 5 uploads
-- Admin = unlimited
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_vrm_upload_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(NEW.user_id, 'admin') THEN
    RETURN NEW;
  ELSIF public.has_role(NEW.user_id, 'pro') THEN
    max_allowed := 5;
  ELSE
    max_allowed := 0;
  END IF;

  IF max_allowed = 0 THEN
    RAISE EXCEPTION 'PLAN_LIMIT: Upload VRM hanya tersedia untuk pengguna Pro. Silakan upgrade.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.vrm_models
  WHERE user_id = NEW.user_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'PLAN_LIMIT: Batas % model VRM tercapai untuk paket Anda.', max_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_vrm_upload_limit ON public.vrm_models;
CREATE TRIGGER trg_enforce_vrm_upload_limit
  BEFORE INSERT ON public.vrm_models
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vrm_upload_limit();

-- ============================================================================
-- Trigger: enforce VRMA upload limit (skip admin-uploaded global animations)
-- Note: vrma_animations RLS already restricts inserts to admins, but if we
-- later allow user uploads, this trigger guards by plan.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_vrma_upload_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(NEW.user_id, 'admin') THEN
    RETURN NEW;
  ELSIF public.has_role(NEW.user_id, 'pro') THEN
    max_allowed := 20;
  ELSE
    max_allowed := 0;
  END IF;

  IF max_allowed = 0 THEN
    RAISE EXCEPTION 'PLAN_LIMIT: Upload animasi VRMA hanya tersedia untuk pengguna Pro.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.vrma_animations
  WHERE user_id = NEW.user_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'PLAN_LIMIT: Batas % animasi VRMA tercapai.', max_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_vrma_upload_limit ON public.vrma_animations;
CREATE TRIGGER trg_enforce_vrma_upload_limit
  BEFORE INSERT ON public.vrma_animations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vrma_upload_limit();