/*
  # Add Rounds Support

  1. New Tables
    - `rounds`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `category` (text, either 'pelicula' or 'sigla')
      - `moderator_id` (uuid, foreign key to players)
      - `created_at` (timestamp)
      - `active` (boolean)

  2. Changes
    - Add `current_round_id` to games table
    
  3. Security
    - Enable RLS
    - Add policies for public access
*/

-- Create rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('pelicula', 'sigla')),
  moderator_id uuid REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Create unique index for one active round per game
CREATE UNIQUE INDEX one_active_round_per_game ON rounds (game_id) WHERE active = true;

-- Add current_round_id to games
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS current_round_id uuid REFERENCES rounds(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

-- Create policies for rounds
CREATE POLICY "Enable read access for all users" ON rounds
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON rounds
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON rounds
  FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS rounds_game_id_idx ON rounds(game_id);
CREATE INDEX IF NOT EXISTS rounds_moderator_id_idx ON rounds(moderator_id);
CREATE INDEX IF NOT EXISTS rounds_active_idx ON rounds(active);