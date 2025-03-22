/*
  # Add player status and connection tracking

  1. Changes
    - Add status column to players table
    - Add last_seen column to track player connection
    - Add avatar_color column for player identification
    - Add indexes for performance optimization

  2. Security
    - Update RLS policies to allow status updates
*/

-- Add new columns to players table
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS avatar_color text NOT NULL DEFAULT '#000000';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS players_status_idx ON players(status);
CREATE INDEX IF NOT EXISTS players_last_seen_idx ON players(last_seen);

-- Update RLS policies
CREATE POLICY "Enable update for player status"
  ON players
  FOR UPDATE
  USING (true)
  WITH CHECK (true);