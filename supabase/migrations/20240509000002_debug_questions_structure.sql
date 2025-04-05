-- Función para verificar las categorías en la tabla questions
CREATE OR REPLACE FUNCTION debug_questions_categories()
RETURNS TABLE (category TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT q.category, COUNT(*) 
  FROM questions q 
  GROUP BY q.category;
END;
$$ LANGUAGE plpgsql;

-- Actualizar función para manejar cualquier categoría
CREATE OR REPLACE FUNCTION initialize_game_questions(p_game_id UUID, total_rounds INTEGER DEFAULT 7)
RETURNS VOID AS $$
DECLARE
  question_record RECORD;
  current_round INTEGER;
  -- Incluir todas las categorías permitidas
  category_array TEXT[] := ARRAY['Peliculas', 'Siglas', 'Personajes', 'Palabras', 'Muertes', 'Idiomas'];
  category_index INTEGER;
  valid_categories TEXT[];
BEGIN
  -- Obtener categorías existentes en la tabla questions
  SELECT ARRAY_AGG(DISTINCT category) INTO valid_categories FROM questions;
  
  -- Registrar para depuración
  RAISE NOTICE 'Categorías disponibles: %', valid_categories;
  
  -- Eliminar asignaciones previas
  DELETE FROM game_questions WHERE game_id = p_game_id;
  
  -- Seleccionar preguntas aleatorias para cada ronda
  FOR current_round IN 1..total_rounds LOOP
    -- Ajustar índice de categoría para no salirse del array
    category_index := 1 + ((current_round - 1) % array_length(COALESCE(valid_categories, ARRAY['Peliculas']), 1));
    
    -- Seleccionar categoría para esta ronda, usando las categorías disponibles
    DECLARE
      current_category TEXT;
    BEGIN
      IF array_length(valid_categories, 1) > 0 THEN
        current_category := valid_categories[category_index];
      ELSE
        -- Si no hay categorías válidas, usar una permitida
        current_category := category_array[1];
      END IF;
      
      RAISE NOTICE 'Seleccionando para ronda % categoría: %', current_round, current_category;
      
      -- Seleccionar pregunta aleatoria
      SELECT q.* INTO question_record
      FROM questions q
      WHERE q.category = current_category
      AND NOT EXISTS (
        SELECT 1 FROM game_questions gq 
        WHERE gq.game_id = p_game_id
        AND gq.question_id = q.id
      )
      ORDER BY RANDOM()
      LIMIT 1;
      
      -- Si no hay preguntas en esa categoría, seleccionar cualquiera
      IF question_record IS NULL THEN
        RAISE NOTICE 'No hay preguntas para categoría %, seleccionando cualquiera', current_category;
        
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
    END;
    
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