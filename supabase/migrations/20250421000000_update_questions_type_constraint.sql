-- Ampliar el constraint de la columna type en la tabla questions para permitir el valor 3
ALTER TABLE questions
DROP CONSTRAINT IF EXISTS questions_type_check;

ALTER TABLE questions
ADD CONSTRAINT questions_type_check CHECK (type IN (1, 2, 3)); 