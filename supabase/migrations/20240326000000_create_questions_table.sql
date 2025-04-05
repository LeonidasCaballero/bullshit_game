-- Crear tabla de preguntas
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id VARCHAR(50) UNIQUE,  -- ID original, mantenemos por compatibilidad
  type VARCHAR(50) NOT NULL,       -- Tipo de pregunta
  question_intro TEXT,             -- Introducción/contexto
  question_text TEXT NOT NULL,     -- Pregunta principal
  answer TEXT NOT NULL,            -- Respuesta correcta
  category VARCHAR(50),            -- Categoría temática
  difficulty SMALLINT DEFAULT 2,   -- Nivel de dificultad 1-5
  created_at TIMESTAMPTZ DEFAULT NOW(),
  times_used INTEGER DEFAULT 0,    -- Contador de uso
  times_answered_correctly INTEGER DEFAULT 0  -- Aciertos
);

-- Crear índices para búsquedas eficientes
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_times_used ON questions(times_used); 