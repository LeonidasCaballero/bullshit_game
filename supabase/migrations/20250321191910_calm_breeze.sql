/*
  # Add voting support

  1. Changes
    - Add reading_phase and voting_phase to rounds table
    - Create votes table for player votes
    - Add policies for votes table

  2. Security
    - Enable RLS on votes table
    - Add policies for public access
*/

-- Add phase columns to rounds
ALTER TABLE rounds 
ADD COLUMN IF NOT EXISTS reading_phase boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS voting_phase boolean DEFAULT false;

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_answer text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, player_id)
);

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies for votes
CREATE POLICY "Enable insert access for all users"
  ON votes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users"
  ON votes
  FOR SELECT
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS votes_round_id_idx ON votes(round_id);
CREATE INDEX IF NOT EXISTS votes_player_id_idx ON votes(player_id);