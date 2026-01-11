import pool from '../config/db.js';

export async function insertMetrics(userId, metrics) {

    const { screen, event, render_time, frame_drops } = metrics;

    await pool.query(

        `INSERT INTO metrics (user_id, screen, event, render_time, frame_drops)

         VALUES ($1, $2, $3, $4, $5)`,

        [userId, screen, event, render_time, frame_drops]

    )
}

export async function getUserMetrics(userId) {

    const result = await pool.query(

        `SELECT * FROM metrics WHERE user_id = $1`,
        [userId]
    );

    return result.rows;

}