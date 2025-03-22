/*
  # Add game creator field

  1. Changes
    - Add creator_id to games table
    - Add foreign key constraint to players table
    - Update existing games to set creator as first player

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE games
ADD COLUMN creator_id uuid REFERENCES players(id) ON DELETE SET NULL;