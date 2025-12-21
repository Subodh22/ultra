-- Add google_token_expires_at column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP WITH TIME ZONE;

