-- Actualizar función para usar las categorías correctas
CREATE OR REPLACE FUNCTION initialize_game_questions(p_game_id UUID, total_rounds INTEGER DEFAULT 7)
RETURNS VOID AS $$
DECLARE
  question_record RECORD;
  current_round INTEGER;
  category_array TEXT[] := ARRAY['Peliculas', 'Siglas', 'Personajes', 'Peliculas', 'Siglas', 'Personajes', 'Peliculas'];
  category_index INTEGER;
BEGIN
  -- Eliminar asignaciones previas
  DELETE FROM game_questions WHERE game_id = p_game_id;
  
  -- Seleccionar preguntas aleatorias para cada ronda
  FOR current_round IN 1..total_rounds LOOP
    -- Seleccionar categoría para esta ronda
    category_index := 1 + ((current_round - 1) % array_length(category_array, 1));
    
    -- Seleccionar pregunta aleatoria de esta categoría
    SELECT q.* INTO question_record
    FROM questions q
    WHERE q.category = category_array[category_index]
    AND NOT EXISTS (
      -- Excluir preguntas ya asignadas a este juego
      SELECT 1 FROM game_questions gq 
      WHERE gq.game_id = p_game_id
      AND gq.question_id = q.id
    )
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Si no hay preguntas en esa categoría, seleccionar cualquiera
    IF question_record IS NULL THEN
      SELECT q.* INTO question_record
      FROM questions q
      WHERE NOT EXISTS (
        SELECT 1 FROM game_questions gq 
        WHERE gq.game_id = p_game_id
        AND gq.question_id = q.id
      )
      ORDER BY RANDOM()
      LIMIT 1;
    END IF;
    
    -- Insertar en la tabla de preguntas por juego
    IF question_record IS NOT NULL THEN
      INSERT INTO game_questions 
        (game_id, question_id, round_number, used)
      VALUES 
        (p_game_id, question_record.id, current_round, FALSE);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql; 