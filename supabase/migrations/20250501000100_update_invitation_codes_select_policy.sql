-- Ajustar política SELECT para invitation_codes
-- Eliminar la política anterior de lectura limitada a códigos sin usar
DROP POLICY IF EXISTS "allow_read_unused_codes" ON public.invitation_codes;

-- Eliminar la política previa si existe para evitar duplicados
DROP POLICY IF EXISTS "allow_read_invitation_codes" ON public.invitation_codes;

-- Permitir leer:
-- 1) Códigos no usados (para validar antes del registro)
-- 2) El código que el propio usuario acaba de utilizar (used_by = auth.uid())
CREATE POLICY "allow_read_invitation_codes" ON public.invitation_codes
  FOR SELECT USING (used_by IS NULL OR used_by = auth.uid()); 