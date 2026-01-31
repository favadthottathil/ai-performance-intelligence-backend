import pool from "../config/db.js";

export async function insertApp(userId, name, apiKey) {


    const result = await pool.query(
        `INSERT INTO apps (user_id, name, api_key)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, name, api_key`,
        [userId, name, apiKey]
    );

    return result.rows[0];
}

export async function getApp(userId) {
    const result = await pool.query(
        `SELECT id, name, api_key FROM apps WHERE user_id = $1`,
        [userId]
    );

    return result.rows;
}

export async function checkAppExists(userId) {
    const result = await pool.query(
        `SELECT id FROM apps WHERE user_id = $1`,
        [userId]
    );

    return result;
}

export async function rotateAppKey(appId, newApiKey, name) {
    const result = await pool.query(
        `UPDATE apps
       SET name = $1,
           api_key = $2
       WHERE id = $3
       RETURNING id, name, api_key`,
        [name.trim(), newApiKey, appId]
    );
    return result.rows[0];
}
