-- Añadir columna scoring_phase a la tabla rounds
ALTER TABLE rounds
ADD COLUMN scoring_phase BOOLEAN DEFAULT FALSE; 