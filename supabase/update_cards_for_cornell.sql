-- Add cornell_note_id to cards table to link cards to both uploaded notes and cornell notes
ALTER TABLE cards ADD COLUMN IF NOT EXISTS cornell_note_id UUID REFERENCES cornell_notes(id) ON DELETE CASCADE;

-- Make note_id nullable since cards can come from either notes or cornell_notes
ALTER TABLE cards ALTER COLUMN note_id DROP NOT NULL;

-- Drop the constraint if it exists, then recreate it
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_source_check;

-- Add check to ensure cards have either note_id or cornell_note_id
ALTER TABLE cards ADD CONSTRAINT cards_source_check 
  CHECK (
    (note_id IS NOT NULL AND cornell_note_id IS NULL) OR 
    (note_id IS NULL AND cornell_note_id IS NOT NULL)
  );

-- Create index for cornell_note_id
CREATE INDEX IF NOT EXISTS idx_cards_cornell_note_id ON cards(cornell_note_id);

