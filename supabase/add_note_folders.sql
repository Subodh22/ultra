-- Create note_folders table
CREATE TABLE IF NOT EXISTS note_folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES note_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add folder_id to cornell_notes
ALTER TABLE cornell_notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES note_folders(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_note_folders_user_id ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_note_folders_parent_id ON note_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_cornell_notes_folder_id ON cornell_notes(folder_id);

-- Enable RLS
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_folders
DROP POLICY IF EXISTS "Users can view their own folders" ON note_folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON note_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON note_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON note_folders;

CREATE POLICY "Users can view their own folders" ON note_folders
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own folders" ON note_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own folders" ON note_folders
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own folders" ON note_folders
  FOR DELETE USING (auth.uid() = user_id);

