-- Añadir columna has_voted si no existe
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS has_voted BOOLEAN DEFAULT FALSE; 