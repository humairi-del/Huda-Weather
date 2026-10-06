CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_visitor_day_idx ON ai_usage(visitor_hash,created_at DESC);
INSERT INTO schema_migrations(version) VALUES ('006_ai_usage') ON CONFLICT (version) DO NOTHING;
