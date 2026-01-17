import pool from "../config/db.js";
import { generateApiKey } from "../utils/generateApiKey.js";

export async function createApp(req, res) {

    const { name } = req.body;

    const userId = req.user.userId;

    const apiKey = generateApiKey();

    const result = await pool.query(
        `INSERT INTO apps (user_id, name, api_key)
        VALUES ($1, $2, $3)
        RETURNING id, name, api_key`,
        [userId, name, apiKey]
    );

    res.status(201).json(result.rows[0]);

}