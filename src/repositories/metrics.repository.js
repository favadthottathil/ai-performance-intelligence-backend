import pool from '../config/db.js';

export async function insertMetrics(appId, metrics) {
    const {
        screen,
        event,
        render_time_ms,
        frame_time_ms,
        frame_dropped,
    } = metrics;

    await pool.query(
        `
    INSERT INTO metrics (
      app_id,
      screen,
      event,
      render_time,
      frame_time,
      frame_dropped
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
        [
            appId,
            screen,
            event,
            render_time_ms ?? null,
            frame_time_ms ?? null,
            frame_dropped ?? null,
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