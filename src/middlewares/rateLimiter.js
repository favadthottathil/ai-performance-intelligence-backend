import rateLimit from "express-rate-limit";

// Every device running the host app shares one app-level API key, so this
// budget is consumed by the whole installed base rather than by one client.
// At the SDK's default 5s flush interval a single device spends ~12 req/min,
// so the previous 300/min ceiling was exhausted by roughly 25 concurrent
// devices — and because the SDK fails silently, the result was invisible data
// loss rather than a visible error. The limit is therefore sized for a real
// installed base while still bounding abuse of a single leaked key.
const DEFAULT_LIMIT = 6000;

export const metricsRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.METRICS_RATE_LIMIT) || DEFAULT_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers["x-api-key"] || req.ip,
    message: { error: "Too many requests, please slow down." },
});
