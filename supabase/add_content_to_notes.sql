-- Add content column to notes table to store the actual note text
ALTER TABLE notes ADD COLUMN IF NOT EXISTS content TEXT;

