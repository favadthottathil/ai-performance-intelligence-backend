import rateLimit from "express-rate-limit";

// Ingestion can come from many devices sharing one app-level API key, so the
// limit is generous but still bounds abuse of a single key.
export const metricsRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.METRICS_RATE_LIMIT) || 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers["x-api-key"] || req.ip,
    message: { error: "Too many requests, please slow down." },
});
