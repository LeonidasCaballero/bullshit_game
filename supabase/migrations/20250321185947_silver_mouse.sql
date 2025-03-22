/*
  # Add correct answers to questions

  1. Changes
    - Add correct_answer column to questions table
    - Update existing questions with their correct answers
    
  2. Notes
    - Each question now includes both the content to guess and its correct answer
    - For movies: the correct answer is a brief plot summary
    - For acronyms: the correct answer is the full meaning
    - For characters: the correct answer describes why they are known
*/

-- Add correct_answer column
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS correct_answer text NOT NULL DEFAULT '';

-- Update existing questions with correct answers
UPDATE questions 
SET correct_answer = CASE
  -- Movies
  WHEN content = 'La nevera' THEN 
    'Un electrodoméstico cobra vida y aterroriza a una familia en su propia casa'
  WHEN content = 'Maestro de pala' THEN 
    'Un profesor de jardinería descubre que puede controlar las plantas y decide vengarse de sus enemigos'
  
  -- Acronyms
  WHEN content = 'AMS' THEN 
    'Asociación Mundial de Surfistas'
  WHEN content = 'OWER' THEN 
    'Organización Mundial de Energías Renovables'
  
  -- Characters
  WHEN content = 'DJ Mario' THEN 
    'Famoso por mezclar música de videojuegos clásicos en festivales de electrónica'
  WHEN content = 'Davo Suker' THEN 
    'Legendario futbolista croata conocido por su participación en el Mundial de 1998'
  ELSE
    'Respuesta no disponible'
END
WHERE correct_answer = '';

-- Add constraint to ensure correct_answer is not empty
ALTER TABLE questions
ADD CONSTRAINT questions_correct_answer_not_empty 
CHECK (correct_answer <> '');