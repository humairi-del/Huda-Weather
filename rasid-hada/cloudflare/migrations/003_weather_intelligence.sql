-- Rasid Hada weather intelligence foundation
-- Stores normalized model forecasts, verification, analysis runs, and material alerts.

CREATE TABLE IF NOT EXISTS weather_model_runs (
  id VARCHAR(36) PRIMARY KEY,
  model VARCHAR(20) NOT NULL CHECK (model IN ('ECMWF','GFS','ICON','AIFS','CMC')),
  run_time TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(200) NOT NULL,
  UNIQUE(model, run_time)
);

CREATE TABLE IF NOT EXISTS weather_forecast_points (
  id VARCHAR(36) PRIMARY KEY,
  run_id VARCHAR(36) NOT NULL REFERENCES weather_model_runs(id) ON DELETE CASCADE,
  target_time TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  rain_mm DOUBLE PRECISION,
  rain_probability DOUBLE PRECISION CHECK (rain_probability IS NULL OR (rain_probability >= 0 AND rain_probability <= 100)),
  temperature_c DOUBLE PRECISION,
  humidity_pct DOUBLE PRECISION CHECK (humidity_pct IS NULL OR (humidity_pct >= 0 AND humidity_pct <= 100)),
  wind_kph DOUBLE PRECISION,
  wind_direction_deg DOUBLE PRECISION,
  thunder_probability DOUBLE PRECISION CHECK (thunder_probability IS NULL OR (thunder_probability >= 0 AND thunder_probability <= 100)),
  severe_risk VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (severe_risk IN ('none','low','moderate','high','extreme')),
  raw_summary TEXT,
  UNIQUE(run_id, target_time, latitude, longitude)
);
CREATE INDEX IF NOT EXISTS ix_weather_points_target ON weather_forecast_points(target_time);
CREATE INDEX IF NOT EXISTS ix_weather_points_run ON weather_forecast_points(run_id);

CREATE TABLE IF NOT EXISTS weather_verifications (
  id VARCHAR(36) PRIMARY KEY,
  model VARCHAR(20) NOT NULL CHECK (model IN ('ECMWF','GFS','ICON','AIFS','CMC')),
  forecast_time TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rain_forecast_mm DOUBLE PRECISION,
  rain_observed_mm DOUBLE PRECISION,
  absolute_error DOUBLE PRECISION,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS ix_weather_verification_model_time ON weather_verifications(model, forecast_time DESC);

CREATE TABLE IF NOT EXISTS analysis_runs (
  id VARCHAR(36) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  horizon_start TIMESTAMPTZ NOT NULL,
  horizon_end TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  summary TEXT NOT NULL,
  best_model VARCHAR(20),
  confidence VARCHAR(20) NOT NULL DEFAULT 'unknown' CHECK (confidence IN ('unknown','low','medium','high')),
  material_change BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS weather_alerts (
  id VARCHAR(36) PRIMARY KEY,
  analysis_id VARCHAR(36) REFERENCES analysis_runs(id) ON DELETE SET NULL,
  alert_type VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info','watch','warning','severe')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS ix_weather_alerts_active_created ON weather_alerts(active, created_at DESC);

INSERT INTO schema_migrations(version)
VALUES ('003_weather_intelligence')
ON CONFLICT (version) DO NOTHING;
