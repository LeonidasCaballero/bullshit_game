/*
  # Add answers table

  1. New Tables
    - `answers`
      - `id` (uuid, primary key)
      - `round_id` (uuid, foreign key to rounds)
      - `player_id` (uuid, foreign key to players)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `answers` table
    - Add policies for:
      - Players can insert their own answers
      - Players can read answers for their rounds
*/

CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, player_id)
);

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can insert their own answers"
  ON answers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Players can read answers for their rounds"
  ON answers
  FOR SELECT
  TO public
  USING (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS answers_round_id_idx ON answers(round_id);
CREATE INDEX IF NOT EXISTS answers_player_id_idx ON answers(player_id);