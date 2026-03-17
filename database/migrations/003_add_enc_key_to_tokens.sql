-- Run in Supabase SQL editor
ALTER TABLE access_tokens ADD COLUMN IF NOT EXISTS enc_key_hex TEXT;
