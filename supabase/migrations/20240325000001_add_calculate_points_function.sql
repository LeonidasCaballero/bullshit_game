-- Crear función para calcular puntos totales
CREATE OR REPLACE FUNCTION calculate_player_points(game_id_param UUID)
RETURNS TABLE (player_id UUID, total_points INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.player_id,
    SUM(s.points)::INTEGER AS total_points
  FROM 
    scores s
  JOIN
    round_results rr ON s.round_id = rr.round_id
  WHERE 
    s.game_id = game_id_param
    AND rr.processed = true
  GROUP BY 
    s.player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 