-- Add field to track the last content that was used to generate cards
ALTER TABLE cornell_notes ADD COLUMN IF NOT EXISTS last_processed_content TEXT;
ALTER TABLE cornell_notes ADD COLUMN IF NOT EXISTS last_cards_generated_at TIMESTAMP WITH TIME ZONE;

