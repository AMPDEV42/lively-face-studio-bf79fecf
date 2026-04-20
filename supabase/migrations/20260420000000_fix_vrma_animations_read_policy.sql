-- Allow all authenticated users to read active animations (so idle/talking VRMA loads for non-admin users)
DROP POLICY IF EXISTS "Admins can view all animations" ON public.vrma_animations;

CREATE POLICY "Admins can view all animations"
  ON public.vrma_animations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active animations"
  ON public.vrma_animations FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);
