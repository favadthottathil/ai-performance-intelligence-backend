import port from "../config/db.js";

export async function appAuthMiddleware(req, res, next) {

    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
        return res.status(401).json({
            error: "API key is missing"
        });
    }

    const result = await pool.query(
        `SELECT id FROM apps WHERE api_key = $1`,
        [apiKey]
    );

    if (result.rows.length === 0) {
        return res.status(401).json({
            error: "Invalid API key"
        });
    }

    req.appId = result.rows[0].id;

    next();

}