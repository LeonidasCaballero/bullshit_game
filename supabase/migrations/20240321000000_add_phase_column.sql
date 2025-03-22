-- Añadir columna phase a la tabla rounds
ALTER TABLE rounds 
ADD COLUMN phase VARCHAR(20) DEFAULT 'answering';

-- Actualizar los registros existentes basados en las columnas actuales
UPDATE rounds 
SET phase = CASE
  WHEN voting_phase = true THEN 'voting'
  WHEN reading_phase = true THEN 'reading'
  ELSE 'answering'
END; 