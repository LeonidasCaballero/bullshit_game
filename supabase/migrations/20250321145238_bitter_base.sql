/*
  # Game and Players Schema

  1. New Tables
    - `games`
      - `id` (uuid, primary key)
      - `name` (text, game group name)
      - `created_at` (timestamp)
      - `started` (boolean, indicates if game has started)
      
    - `players`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `name` (text, player name)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (since we're not using auth for this game)
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  started boolean DEFAULT false
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create policies for games
CREATE POLICY "Enable read access for all users" ON games
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON games
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON games
  FOR UPDATE USING (true);

-- Create policies for players
CREATE POLICY "Enable read access for all users" ON players
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON players
  FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS players_game_id_idx ON players(game_id);
CREATE INDEX IF NOT EXISTS players_created_at_idx ON players(created_at);