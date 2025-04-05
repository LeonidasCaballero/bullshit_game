-- Examinar la estructura y restricciones de la tabla rounds
DO $$
DECLARE
  constraint_info record;
BEGIN
  FOR constraint_info IN
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'rounds'::regclass
  LOOP
    RAISE NOTICE 'Constraint: % - %', constraint_info.conname, constraint_info.def;
  END LOOP;
END $$;

-- Vamos a eliminar y recrear la restricción para solucionar el problema
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_category_check;

-- Crear una nueva restricción basada en las categorías reales en la tabla questions
DO $$
DECLARE
  categories_list text;
BEGIN
  -- Obtener lista de categorías de la tabla questions
  SELECT string_agg(DISTINCT quote_literal(category), ', ')
  INTO categories_list
  FROM questions;
  
  IF categories_list IS NULL OR categories_list = '' THEN
    -- Usar valores por defecto si no hay categorías
    categories_list := '''Peliculas'', ''Siglas'', ''Personajes'', ''Palabras'', ''Muertes'', ''Idiomas''';
  END IF;
  
  -- Crear la restricción dinámicamente
  EXECUTE 'ALTER TABLE rounds ADD CONSTRAINT rounds_category_check 
           CHECK (category IN (' || categories_list || '))';
  
  RAISE NOTICE 'Restricción recreada con categorías: %', categories_list;
END $$;

-- Mostrar las categorías actuales en la tabla questions
SELECT DISTINCT category FROM questions; 