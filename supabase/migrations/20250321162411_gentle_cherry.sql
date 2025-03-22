/*
  # Fix rounds category constraint

  1. Changes
    - Update the category check constraint in rounds table to include 'personaje'
*/

ALTER TABLE rounds 
DROP CONSTRAINT IF EXISTS rounds_category_check;

ALTER TABLE rounds 
ADD CONSTRAINT rounds_category_check 
CHECK (category IN ('pelicula', 'sigla', 'personaje'));