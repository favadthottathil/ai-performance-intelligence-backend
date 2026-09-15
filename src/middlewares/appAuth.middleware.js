import pool from "../config/db.js";

const CACHE_TTL_MS = 60_000;
const apiKeyCache = new Map();

/// Drops a key from the cache so a rotated/revoked key stops being accepted
/// immediately instead of lingering until its TTL expires.
export function invalidateApiKey(apiKey) {
    if (apiKey) apiKeyCache.delete(apiKey);
}

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

    try {
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

        return next();
    } catch (error) {
        // A DB outage must surface as a handled 503, not an unhandled
        // rejection that takes the ingestion endpoint down.
        return next(error);
    }
}
