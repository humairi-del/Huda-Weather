ALTER TABLE weather_forecast_points ADD COLUMN IF NOT EXISTS cloud_cover_pct numeric;
ALTER TABLE weather_forecast_points ADD COLUMN IF NOT EXISTS wind_gust_kph numeric;
INSERT INTO schema_migrations(version) VALUES ('005_weather_details') ON CONFLICT (version) DO NOTHING;