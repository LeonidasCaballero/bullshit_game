CREATE TABLE access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(12) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  signup_token UUID,
  signup_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_signup_token ON access_codes(signup_token);

-- Añadir política de seguridad
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y actualización pero no inserción o eliminación
CREATE POLICY "Enable read access for all users" ON access_codes
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable update for valid codes" ON access_codes
  FOR UPDATE TO public
  USING (NOT is_used)
  WITH CHECK (NOT is_used); 