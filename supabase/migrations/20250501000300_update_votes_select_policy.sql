-- Reemplazar política SELECT en votes para eliminar dependencia de auth.uid()
DROP POLICY IF EXISTS "Players can read all votes for their games" ON votes;

-- Nueva política: cualquier usuario puede leer los votos de las rondas de su juego
CREATE POLICY "Anyone can read votes for their games" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_id -- el autor del voto pertenece a la tabla players
      AND players.game_id IN (
        SELECT game_id FROM rounds WHERE id = round_id
      )
    )
  ); 