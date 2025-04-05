-- Eliminar la restricción actual
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_category_check;

-- Crear una nueva restricción que permita los valores existentes
ALTER TABLE rounds 
ADD CONSTRAINT rounds_category_check 
CHECK (category IN ('Siglas', 'Palabras', 'Personajes', 'Peliculas', 'Muertes', 'Idiomas')); 