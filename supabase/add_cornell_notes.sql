-- Add Cornell notes table
CREATE TABLE IF NOT EXISTS cornell_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cue_column TEXT NOT NULL DEFAULT '',
  notes_area TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_draft BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_cornell_notes_user_id ON cornell_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_cornell_notes_created_at ON cornell_notes(created_at DESC);

-- Enable RLS
ALTER TABLE cornell_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own cornell notes" ON cornell_notes;
DROP POLICY IF EXISTS "Users can insert their own cornell notes" ON cornell_notes;
DROP POLICY IF EXISTS "Users can update their own cornell notes" ON cornell_notes;
DROP POLICY IF EXISTS "Users can delete their own cornell notes" ON cornell_notes;

CREATE POLICY "Users can view their own cornell notes" ON cornell_notes
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own cornell notes" ON cornell_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own cornell notes" ON cornell_notes
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own cornell notes" ON cornell_notes
  FOR DELETE USING (auth.uid() = user_id);

