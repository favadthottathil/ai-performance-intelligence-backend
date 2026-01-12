import pool from "../config/db.js";

export async function createUser(email, password_hash) {

    const result = await pool.query(

        `INSERT INTO users (email, password_hash)

        VALUES ($1, $2)

        RETURNING id,email`,

        [email, password_hash]
    );

    return result.rows[0];

}

export async function findUserByEmail(email) {

    const result = await pool.query(

        `SELECT * FROM users WHERE email = $1`,
        [email]
    );

    return result.rows[0];

}