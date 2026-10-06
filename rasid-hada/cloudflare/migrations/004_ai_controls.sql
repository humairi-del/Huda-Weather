CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO system_settings(key,value) VALUES
 ('ai_enabled','false'),
 ('visitor_ai_daily_limit','10')
ON CONFLICT (key) DO NOTHING;
INSERT INTO schema_migrations(version) VALUES ('004_ai_controls') ON CONFLICT (version) DO NOTHING;