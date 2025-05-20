-- Actualizar las políticas de seguridad para la tabla votes

-- Eliminar las políticas existentes si las hay
DROP POLICY IF EXISTS "Players can insert their own votes" ON votes;
DROP POLICY IF EXISTS "Players can update their own votes" ON votes;
DROP POLICY IF EXISTS "Players can read all votes for their games" ON votes;

-- Crear políticas que permitan tanto insert como update (para upsert)
CREATE POLICY "Players can insert their own votes"
  ON votes
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = player_id OR
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_id
      AND players.game_id IN (
        SELECT game_id FROM rounds WHERE id = round_id
      )
    )
  );

CREATE POLICY "Players can update their own votes"
  ON votes
  FOR UPDATE
  TO public
  USING (
    auth.uid() = player_id OR
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_id
      AND players.game_id IN (
        SELECT game_id FROM rounds WHERE id = round_id
      )
    )
  );

CREATE POLICY "Players can read all votes for their games"
  ON votes
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.game_id IN (
        SELECT game_id FROM rounds WHERE id = round_id
      )
    )
  ); 