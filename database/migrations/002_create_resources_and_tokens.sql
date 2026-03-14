-- Run this in Supabase SQL editor after 001_create_users.sql

-- Resources: stores encrypted credentials for each website/app
CREATE TABLE IF NOT EXISTS resources (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_name  TEXT        NOT NULL,
  resource_url   TEXT        NOT NULL,
  encrypted_data TEXT        NOT NULL,  -- AES-256 encrypted JSON {username, password}
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_owner ON resources (owner_id);

-- Access tokens: the core table — one row per share
CREATE TABLE IF NOT EXISTS access_tokens (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id      UUID        NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  token_hash       TEXT        UNIQUE NOT NULL,  -- SHA-256 hash of the raw token
  recipient_email  TEXT        NOT NULL,          -- plaintext for now, encrypted in future
  expires_at       TIMESTAMPTZ NOT NULL,
  max_uses         INTEGER     NOT NULL DEFAULT 1,
  uses_count       INTEGER     NOT NULL DEFAULT 0,
  permissions      JSONB       NOT NULL DEFAULT '{"access": "full"}',
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'expired', 'revoked')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_resource  ON access_tokens (resource_id);
CREATE INDEX IF NOT EXISTS idx_tokens_hash      ON access_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_status    ON access_tokens (status);

-- Audit logs: every access attempt recorded
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id    UUID        NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL
              CHECK (event_type IN ('access_granted', 'access_denied', 'token_expired', 'token_revoked')),
  ip_address  TEXT,
  device_info TEXT,
  metadata    JSONB,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_token     ON audit_logs (token_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp);
