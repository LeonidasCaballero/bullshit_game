-- Eliminar definitivamente la restricción de categoría
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_category_check; 