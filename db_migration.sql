ALTER TABLE metrics ADD COLUMN api_latency INTEGER;
ALTER TABLE metrics ADD COLUMN is_error BOOLEAN;
ALTER TABLE metrics ADD COLUMN error_message TEXT;
ALTER TABLE metrics ADD COLUMN stack_trace TEXT;
ALTER TABLE metrics ADD COLUMN screen_load_time INTEGER;
