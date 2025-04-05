-- Normalizar categorías en la tabla questions
UPDATE questions 
SET category = 'Peliculas' 
WHERE category = 'Películas';

-- Normalizar categorías en otras tablas relacionadas si es necesario
UPDATE rounds
SET category = 'Peliculas' 
WHERE category = 'Películas'; 