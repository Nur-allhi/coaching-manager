-- Core metadata and audit tables.
-- app_meta is created by the migration runner before any migration runs.
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  at INTEGER NOT NULL,
  user_id TEXT,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  undone INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_audit_log_entity ON audit_log (entity, entity_id);
