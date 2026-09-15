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
        `SELECT id, name, api_key FROM apps WHERE user_id = $1 ORDER BY created_at ASC`,
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

/// Rotates the key of one specific app the caller owns. Scoping the UPDATE by
/// `user_id` as well as `id` means a caller can never rotate another user's
/// key by guessing an app id.
export async function rotateAppKey(appId, userId, newApiKey) {
    const result = await pool.query(
        `UPDATE apps
       SET api_key = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, api_key`,
        [newApiKey, appId, userId]
    );
    return result.rows[0];
}

/// Reads the current key of an app the caller owns, so the ingestion cache
/// entry for it can be evicted when the key is replaced.
export async function getAppKey(appId, userId) {
    const result = await pool.query(
        `SELECT api_key FROM apps WHERE id = $1 AND user_id = $2`,
        [appId, userId]
    );
    return result.rows[0]?.api_key ?? null;
}
