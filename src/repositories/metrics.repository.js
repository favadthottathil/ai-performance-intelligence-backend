import pool from '../config/db.js';

export async function insertMetrics(appId, metrics) {

    const { screen, event, render_time, frame_drops } = metrics;

    await pool.query(

        `INSERT INTO metrics (app_id, screen, event, render_time, frame_drops)

         VALUES ($1, $2, $3, $4, $5)`,

        [appId, screen, event, render_time, frame_drops]

    )
}

export async function getUserMetrics(appId) {

    const result = await pool.query(

        `SELECT * FROM metrics WHERE app_id = $1`,
        [appId]
    );

    return result.rows;

}