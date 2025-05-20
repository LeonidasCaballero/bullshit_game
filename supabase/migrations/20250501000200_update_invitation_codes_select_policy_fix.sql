-- Reemplazar política SELECT para invitation_codes
DROP POLICY IF EXISTS "allow_read_invitation_codes" ON public.invitation_codes;

CREATE POLICY "allow_read_invitation_codes" ON public.invitation_codes
  FOR SELECT USING (used_by IS NULL OR used_by = auth.uid()); 