import pool from "../config/db.js";

const CACHE_TTL_MS = 60_000;
const apiKeyCache = new Map();

export async function appAuthMiddleware(req, res, next) {

    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
        return res.status(401).json({
            error: "API key is missing"
        });
    }

    const cached = apiKeyCache.get(apiKey);
    if (cached && cached.expiresAt > Date.now()) {
        req.appId = cached.appId;
        return next();
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

    const appId = result.rows[0].id;
    apiKeyCache.set(apiKey, { appId, expiresAt: Date.now() + CACHE_TTL_MS });

    req.appId = appId;

    next();

}
