import pool from '../config/db.js';

const METRIC_COLUMNS = [
    'app_id',
    'screen',
    'event',
    'render_time',
    'frame_time',
    'frame_dropped',
    'api_latency',
    'is_error',
    'error_message',
    'stack_trace',
    'screen_load_time',
];

function metricValues(appId, metric) {
    return [
        appId,
        metric.screen,
        metric.event,
        metric.render_time ?? null,
        metric.frame_time ?? null,
        metric.frame_dropped ?? null,
        metric.api_latency ?? null,
        metric.is_error ?? null,
        metric.error_message ?? null,
        metric.stack_trace ?? null,
        metric.screen_load_time ?? null,
    ];
}

export async function insertMetrics(appId, metric) {
    await pool.query(
        `INSERT INTO metrics (${METRIC_COLUMNS.join(', ')})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
