-- Set search_path on current_period
CREATE OR REPLACE FUNCTION public.current_period()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
$$;

-- Revoke execute on internal trigger functions from public/authenticated
-- (triggers still fire because they run as table owner, not as caller)
REVOKE EXECUTE ON FUNCTION public.enforce_vrm_upload_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_vrma_upload_limit() FROM PUBLIC, anon, authenticated;