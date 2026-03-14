-- Run this in your Supabase SQL editor to create the users table.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                VARCHAR(255) UNIQUE NOT NULL,
  master_password_hash TEXT        NOT NULL,  -- bcrypt hash, used for login verification
  kdf_salt             TEXT        NOT NULL,  -- hex-encoded Argon2id salt for key derivation
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by email (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
