-- Owner portal only. Apply to a NEW, dedicated Cloudflare D1 database.
CREATE TABLE IF NOT EXISTS content_entries (
 id TEXT PRIMARY KEY,
 section TEXT NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
 id TEXT PRIMARY KEY,
 actor TEXT NOT NULL,
 action TEXT NOT NULL,
 entry_id TEXT NOT NULL,
 before_payload TEXT,
 after_payload TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_entry_time ON audit_events(entry_id,created_at);
