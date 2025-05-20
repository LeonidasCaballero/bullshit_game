CREATE TABLE public.invitation_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL CHECK (char_length(code) = 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ
);

-- Habilitar Row Level Security para aplicar políticas de acceso
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Permitir seleccionar códigos disponibles (no usados)
CREATE POLICY "allow_read_unused_codes" ON public.invitation_codes
  FOR SELECT USING (used_by IS NULL);

-- Permitir actualizar un código para marcarlo como usado por el usuario autenticado
CREATE POLICY "allow_use_code" ON public.invitation_codes
  FOR UPDATE USING (auth.uid() IS NOT NULL AND used_by IS NULL)
  WITH CHECK (used_by = auth.uid()); 