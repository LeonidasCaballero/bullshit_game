-- Eliminar la restricción actual
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_category_check;

-- Crear nueva restricción que permita ambas versiones (con y sin acento)
ALTER TABLE rounds ADD CONSTRAINT rounds_category_check 
CHECK (category IN ('Peliculas', 'Películas', 'Siglas', 'Personajes', 'Palabras', 'Muertes', 'Idiomas')); 