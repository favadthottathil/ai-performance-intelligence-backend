-- Backfills columns on metrics tables created before this migration set existed.
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS api_latency INTEGER;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS is_error BOOLEAN;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS stack_trace TEXT;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS screen_load_time INTEGER;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
