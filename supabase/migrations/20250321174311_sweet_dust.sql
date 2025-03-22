/*
  # Add question_id to rounds table

  1. Changes
    - Add question_id column to rounds table
    - Add foreign key constraint to questions table
    
  2. Notes
    - Uses a safe ALTER TABLE operation
    - Allows NULL for backward compatibility
*/

ALTER TABLE rounds 
ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES questions(id);