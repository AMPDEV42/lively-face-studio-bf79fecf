-- 1. Add multilingual keywords column
ALTER TABLE public.vrma_animations
  ADD COLUMN IF NOT EXISTS trigger_keywords_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Public SELECT policy for active animations (so non-admin users can use the library)
DROP POLICY IF EXISTS "Public can view active animations" ON public.vrma_animations;
CREATE POLICY "Public can view active animations"
  ON public.vrma_animations
  FOR SELECT
  USING (is_active = true);