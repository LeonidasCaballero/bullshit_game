-- Función para ver la estructura de una tabla
CREATE OR REPLACE FUNCTION debug_table_structure(table_name text)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH cols AS (
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM 
      information_schema.columns
    WHERE 
      table_name = debug_table_structure.table_name
  ),
  constraints AS (
    SELECT 
      conname as constraint_name,
      pg_get_constraintdef(oid) as definition
    FROM 
      pg_constraint
    WHERE 
      conrelid = (SELECT oid FROM pg_class WHERE relname = debug_table_structure.table_name)
  )
  SELECT 
    jsonb_build_object(
      'columns', jsonb_agg(cols),
      'constraints', (SELECT jsonb_agg(constraints) FROM constraints)
    ) INTO result
  FROM 
    cols;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 