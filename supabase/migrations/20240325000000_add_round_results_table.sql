-- Crear tabla para controlar el procesamiento de puntuaciones
CREATE TABLE IF NOT EXISTS round_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  round_id UUID REFERENCES rounds(id),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Crear índice para búsquedas rápidas
CREATE INDEX round_results_round_id_idx ON round_results(round_id);

-- Crear restricción de unicidad para evitar duplicados
ALTER TABLE round_results
ADD CONSTRAINT unique_round_processing 
UNIQUE (round_id); 