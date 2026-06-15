CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    screen TEXT NOT NULL,
    event TEXT NOT NULL,
    render_time INTEGER,
    frame_time INTEGER,
    frame_dropped BOOLEAN,
    api_latency INTEGER,
    is_error BOOLEAN,
    error_message TEXT,
    stack_trace TEXT,
    screen_load_time INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
