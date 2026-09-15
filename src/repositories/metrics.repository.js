import pool from '../config/db.js';

const METRIC_COLUMNS = [
    'app_id',
    'screen',
    'target',
    'event',
    'render_time',
    'frame_time',
    'frame_dropped',
    'api_latency',
    'is_error',
    'error_message',
    'stack_trace',
    'screen_load_time',
    'client_timestamp',
];

// Postgres rejects an out-of-range or malformed timestamp for the whole
// multi-row INSERT, so one bad client clock would drop an entire batch.
// Anything unparseable falls back to NULL and `created_at` remains the
// authoritative arrival time.
function parseClientTimestamp(value) {
    if (typeof value !== 'string' || value.length === 0) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function metricValues(appId, metric) {
    return [
        appId,
        metric.screen,
        metric.target ?? null,
        metric.event,
        metric.render_time ?? null,
        metric.frame_time ?? null,
        metric.frame_dropped ?? null,
        metric.api_latency ?? null,
        metric.is_error ?? null,
        metric.error_message ?? null,
        metric.stack_trace ?? null,
        metric.screen_load_time ?? null,
        parseClientTimestamp(metric.client_timestamp),
    ];
}

export async function insertMetrics(appId, metric) {
    const placeholders = METRIC_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');

    await pool.query(
        `INSERT INTO metrics (${METRIC_COLUMNS.join(', ')})
         VALUES (${placeholders})`,
        metricValues(appId, metric)
    );
}

export async function insertMetricsBatch(appId, metrics) {
    if (metrics.length === 0) return;

    const values = [];
    const rowPlaceholders = metrics.map((metric, rowIndex) => {
        values.push(...metricValues(appId, metric));
        const base = rowIndex * METRIC_COLUMNS.length;
        const placeholders = METRIC_COLUMNS.map((_, colIndex) => `$${base + colIndex + 1}`);
        return `(${placeholders.join(', ')})`;
    });

    await pool.query(
        `INSERT INTO metrics (${METRIC_COLUMNS.join(', ')})
         VALUES ${rowPlaceholders.join(', ')}`,
        values
    );
}

export async function getAppMetrics(userId, appId) {

    const result = await pool.query(

        `SELECT id FROM apps WHERE id = $1 AND user_id = $2`,
        [appId, userId]
    );

    return result;

}
export async function getUserMetrics(appId) {

    const metrics = await pool.query(
        `SELECT * FROM metrics WHERE app_id = $1`,
        [appId]
    );
    return metrics.rows;

}
