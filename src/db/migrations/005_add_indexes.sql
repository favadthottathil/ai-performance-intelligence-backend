-- Supports the dashboard's per-app, per-screen aggregation queries and
-- chronological ordering for the real-time metrics stream.
CREATE INDEX IF NOT EXISTS idx_metrics_app_screen_created
    ON metrics (app_id, screen, created_at);
