-- Crear nueva tabla de preguntas
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL, -- 'pelicula', 'sigla', 'personaje', etc.
  text TEXT NOT NULL,            -- Pregunta o contexto
  content TEXT NOT NULL,         -- Contenido principal (ej: título película, significado sigla)
  correct_answer TEXT NOT NULL,  -- Respuesta correcta
  difficulty SMALLINT DEFAULT 1, -- Nivel de dificultad (1-3)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recrear foreign key en la tabla rounds
ALTER TABLE rounds
ADD CONSTRAINT rounds_question_id_fkey 
FOREIGN KEY (question_id) REFERENCES questions(id);

-- Crear índices para búsquedas eficientes
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty); 