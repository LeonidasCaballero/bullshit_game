-- Ajustar política para permitir que cualquier rol (incluido anon) marque el código como usado una vez
DROP POLICY IF EXISTS "allow_use_code" ON public.invitation_codes;

CREATE POLICY "allow_use_code" ON public.invitation_codes
  FOR UPDATE USING (used_by IS NULL)
  WITH CHECK (true); 