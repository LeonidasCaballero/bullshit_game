-- Añadir columna results_phase a la tabla rounds
ALTER TABLE rounds
ADD COLUMN results_phase BOOLEAN DEFAULT FALSE; 