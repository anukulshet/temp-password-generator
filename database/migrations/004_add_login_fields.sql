-- Run in Supabase SQL editor
ALTER TABLE resources ADD COLUMN IF NOT EXISTS login_url      TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS username_field TEXT DEFAULT 'email';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS password_field TEXT DEFAULT 'password';
