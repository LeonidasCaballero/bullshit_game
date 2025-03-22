/*
  # Add round number column

  1. Changes
    - Add `number` column to `rounds` table to track round sequence (1-7)
    
  2. Notes
    - Uses a safe ALTER TABLE operation
    - Defaults to 1 for existing rounds
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rounds' AND column_name = 'number'
  ) THEN
    ALTER TABLE rounds 
    ADD COLUMN number integer NOT NULL DEFAULT 1;
  END IF;
END $$;