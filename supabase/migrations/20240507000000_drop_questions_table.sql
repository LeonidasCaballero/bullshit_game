-- Eliminar referencias a la tabla questions
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_question_id_fkey;

-- Eliminar índices relacionados con la tabla questions
DROP INDEX IF EXISTS idx_questions_type;
DROP INDEX IF EXISTS idx_questions_category;
DROP INDEX IF EXISTS idx_questions_difficulty;
DROP INDEX IF EXISTS idx_questions_times_used;

-- Eliminar la tabla
DROP TABLE IF EXISTS questions; 