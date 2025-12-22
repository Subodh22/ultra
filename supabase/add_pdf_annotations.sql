-- Create table for PDF highlights
CREATE TABLE IF NOT EXISTS pdf_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reading_material_id UUID REFERENCES reading_materials(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  text_content TEXT NOT NULL,
  coordinates JSONB NOT NULL, -- {x, y, width, height} for highlight position
  color TEXT DEFAULT '#ffff00', -- Highlight color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for PDF bookmarks
CREATE TABLE IF NOT EXISTS pdf_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reading_material_id UUID REFERENCES reading_materials(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  scroll_position JSONB, -- Optional: save scroll position
  note TEXT, -- Optional note about the bookmark
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, reading_material_id, page_number) -- One bookmark per page per user
);

-- Create table for PDF page notes
CREATE TABLE IF NOT EXISTS pdf_page_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reading_material_id UUID REFERENCES reading_materials(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  note_text TEXT NOT NULL,
  position JSONB, -- Optional: {x, y} for note position on page
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pdf_highlights_user_material ON pdf_highlights(user_id, reading_material_id);
CREATE INDEX IF NOT EXISTS idx_pdf_highlights_page ON pdf_highlights(reading_material_id, page_number);
CREATE INDEX IF NOT EXISTS idx_pdf_bookmarks_user_material ON pdf_bookmarks(user_id, reading_material_id);
CREATE INDEX IF NOT EXISTS idx_pdf_page_notes_user_material ON pdf_page_notes(user_id, reading_material_id);
CREATE INDEX IF NOT EXISTS idx_pdf_page_notes_page ON pdf_page_notes(reading_material_id, page_number);

-- Enable Row Level Security
ALTER TABLE pdf_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_page_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for highlights
CREATE POLICY "Users can view their own highlights"
  ON pdf_highlights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own highlights"
  ON pdf_highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights"
  ON pdf_highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
  ON pdf_highlights FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON pdf_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
  ON pdf_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON pdf_bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON pdf_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for page notes
CREATE POLICY "Users can view their own page notes"
  ON pdf_page_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own page notes"
  ON pdf_page_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own page notes"
  ON pdf_page_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own page notes"
  ON pdf_page_notes FOR DELETE
  USING (auth.uid() = user_id);

