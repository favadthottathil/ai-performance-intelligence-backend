import pool from '../config/db.js';

export async function insertMetrics(appId, metrics) {
    const {
        screen,
        event,
        render_time,
        frame_time,
        frame_dropped,
        api_latency,
        is_error,
        error_message,
        stack_trace,
        screen_load_time,
    } = metrics;

    await pool.query(
        `
    INSERT INTO metrics (
      app_id,
      screen,
      event,
      render_time,
      frame_time,
      frame_dropped,
      api_latency,
      is_error,
      error_message,
      stack_trace,
      screen_load_time
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
        [
            appId,
            screen,
            event,
            render_time ?? null,
            frame_time ?? null,
            frame_dropped ?? null,
            api_latency ?? null,
            is_error ?? null,
            error_message ?? null,
            stack_trace ?? null,
            screen_load_time ?? null,
        ]
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