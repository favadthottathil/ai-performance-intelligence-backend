-- Separates the "where an event happened" dimension from the "what was called"
-- dimension, and preserves the client-side occurrence time.
--
-- Before this migration, API and crash events were stored with their endpoint
-- path (or a synthetic 'global_error_handler') in `screen`, which polluted the
-- per-screen aggregation with phantom screens whose render metrics were all
-- zero. `target` now holds the endpoint/handler, while `screen` always holds a
-- real, user-visible screen.
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS target TEXT;

-- Occurrence time as stamped by the SDK. `created_at` records arrival time at
-- the server, which can lag by a full flush interval (or much longer if the
-- device was offline), and collapses every event in a batch to the same value.
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ;

-- The dashboard orders and windows by occurrence time, not arrival time.
CREATE INDEX IF NOT EXISTS idx_metrics_app_client_ts
    ON metrics (app_id, client_timestamp);
