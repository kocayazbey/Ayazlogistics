-- Immutable Audit (hash chain)
BEGIN;
CREATE TABLE IF NOT EXISTS audit_immutable (
  id TEXT PRIMARY KEY,
  prev_hash TEXT,
  record JSONB NOT NULL,
  record_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_immutable_created_at ON audit_immutable (created_at);
COMMIT;
