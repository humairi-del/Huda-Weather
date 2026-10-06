-- Rasid Hada initial production schema
-- Applied idempotently to Neon PostgreSQL.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'visitor' CHECK (role IN ('owner','teacher','visitor')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id VARCHAR(36) PRIMARY KEY,
  subject VARCHAR(200) NOT NULL,
  statement TEXT NOT NULL,
  source_note VARCHAR(1000),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_by VARCHAR(36) NOT NULL REFERENCES users(id),
  reviewed_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_knowledge_items_subject ON knowledge_items(subject);
CREATE INDEX IF NOT EXISTS ix_knowledge_items_status ON knowledge_items(status);

CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36) NOT NULL REFERENCES users(id),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS ix_audit_log_created_at ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS visitor_daily_usage (
  usage_date DATE NOT NULL,
  visitor_key VARCHAR(128) NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usage_date, visitor_key)
);

INSERT INTO schema_migrations(version)
VALUES ('001_initial_governance')
ON CONFLICT (version) DO NOTHING;
