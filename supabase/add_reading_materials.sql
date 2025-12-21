-- Create reading_materials table for storing uploaded documents
CREATE TABLE IF NOT EXISTS reading_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reading_materials_user_id ON reading_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_materials_is_read ON reading_materials(is_read);

-- Enable Row Level Security
ALTER TABLE reading_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own reading materials" ON reading_materials;
CREATE POLICY "Users can view their own reading materials"
  ON reading_materials FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reading materials" ON reading_materials;
CREATE POLICY "Users can insert their own reading materials"
  ON reading_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reading materials" ON reading_materials;
CREATE POLICY "Users can update their own reading materials"
  ON reading_materials FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reading materials" ON reading_materials;
CREATE POLICY "Users can delete their own reading materials"
  ON reading_materials FOR DELETE
  USING (auth.uid() = user_id);

