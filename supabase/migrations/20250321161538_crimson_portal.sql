/*
  # Add questions table and sample data

  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `category` (text - pelicula/sigla/personaje)
      - `type` (integer - 1 or 2 for first or second question)
      - `text` (text - the question text)
      - `content` (text - the content to guess, e.g. "La nevera" or "AMS")

  2. Security
    - Enable RLS on questions table
    - Add policy for authenticated users to read questions
*/

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  type integer NOT NULL,
  text text NOT NULL,
  content text NOT NULL,
  CONSTRAINT questions_category_check CHECK (category IN ('pelicula', 'sigla', 'personaje')),
  CONSTRAINT questions_type_check CHECK (type IN (1, 2))
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Add read policy
CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  TO public
  USING (true);

-- Insert sample questions
INSERT INTO questions (category, type, text, content) VALUES
  ('pelicula', 1, '¿Cual es la sinopsis de la pelicula...', 'La nevera'),
  ('pelicula', 2, '¿Cual es la sinopsis de la pelicula...', 'Maestro de pala'),
  ('sigla', 1, '¿Que significan las siglas...', 'AMS'),
  ('sigla', 2, '¿Que significan las siglas...', 'OWER'),
  ('personaje', 1, '¿Por que motivo es conocido...', 'DJ Mario'),
  ('personaje', 2, '¿Por que motivo es conocido...', 'Davo Suker');