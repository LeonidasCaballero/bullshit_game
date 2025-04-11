-- Seed de preguntas para la aplicación Bullshit

-- Preguntas de tipo película
INSERT INTO questions (id, category, type, text, content, correct_answer)
VALUES
  (gen_random_uuid(), 'pelicula', 1, '¿Qué película es esta?', 'Titanic', 'James Cameron'),
  (gen_random_uuid(), 'pelicula', 1, '¿Qué película es esta?', 'El Padrino', 'Francis Ford Coppola'),
  (gen_random_uuid(), 'pelicula', 1, '¿Qué película es esta?', 'Matrix', 'Hermanas Wachowski'),
  (gen_random_uuid(), 'pelicula', 1, '¿Qué película es esta?', 'Pulp Fiction', 'Quentin Tarantino'),
  (gen_random_uuid(), 'pelicula', 1, '¿Qué película es esta?', 'El Rey León', 'Disney'),
  (gen_random_uuid(), 'pelicula', 1, '¿Qué película es esta?', 'Star Wars', 'George Lucas'),
  (gen_random_uuid(), 'pelicula', 1, '¿Qué película es esta?', 'Harry Potter', 'J.K. Rowling');

-- Preguntas de tipo sigla
INSERT INTO questions (id, category, type, text, content, correct_answer)
VALUES
  (gen_random_uuid(), 'sigla', 2, '¿Qué significan estas siglas?', 'ONU', 'Organización de las Naciones Unidas'),
  (gen_random_uuid(), 'sigla', 2, '¿Qué significan estas siglas?', 'NASA', 'National Aeronautics and Space Administration'),
  (gen_random_uuid(), 'sigla', 2, '¿Qué significan estas siglas?', 'FBI', 'Federal Bureau of Investigation'),
  (gen_random_uuid(), 'sigla', 2, '¿Qué significan estas siglas?', 'UNESCO', 'United Nations Educational, Scientific and Cultural Organization'),
  (gen_random_uuid(), 'sigla', 2, '¿Qué significan estas siglas?', 'OTAN', 'Organización del Tratado del Atlántico Norte');

-- Preguntas de tipo personaje
INSERT INTO questions (id, category, type, text, content, correct_answer)
VALUES
  (gen_random_uuid(), 'personaje', 3, '¿Quién es este personaje?', 'Darth Vader', 'Star Wars'),
  (gen_random_uuid(), 'personaje', 3, '¿Quién es este personaje?', 'Harry Potter', 'Saga Harry Potter'),
  (gen_random_uuid(), 'personaje', 3, '¿Quién es este personaje?', 'Spider-Man', 'Marvel Comics'),
  (gen_random_uuid(), 'personaje', 3, '¿Quién es este personaje?', 'Sherlock Holmes', 'Arthur Conan Doyle'),
  (gen_random_uuid(), 'personaje', 3, '¿Quién es este personaje?', 'Don Quijote', 'Miguel de Cervantes'); 