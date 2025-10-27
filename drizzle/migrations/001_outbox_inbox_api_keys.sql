-- Drizzle Migration: outbox, inbox, api_keys
-- Created at: 2025-10-26

BEGIN;

-- Outbox Table
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  aggregate_id TEXT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ NULL,
  last_error TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created_at ON outbox (status, created_at);

-- Inbox Table
CREATE TABLE IF NOT EXISTS inbox (
  id TEXT PRIMARY KEY,
  metadata JSONB NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  label TEXT NULL,
  tenant_id TEXT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked ON api_keys (revoked);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys (expires_at);

COMMIT;
