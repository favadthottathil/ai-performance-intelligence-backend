import { insertMetrics, insertMetricsBatch, getUserMetrics, getAppMetrics } from "../repositories/metrics.repository.js";
import * as aggregator from "../services/metrics.aggregator.js";
import { buildAIPayload } from "../services/ai.payload.builder.js";
import { analyzePerformance } from "../services/gemini.service.js";
import { calculateSeverity } from "../services/severity.scorer.js";
import { publishMetric, subscribeToMetrics } from "../services/metrics.events.js";

const MAX_BATCH_SIZE = 500;

// The dashboard polls /analyze on a short interval. Gemini calls are slow and
// billed per request, and severity thresholds do not move meaningfully within
// a single TTL, so completed analyses are memoized per app.
const ANALYSIS_CACHE_TTL_MS = Number(process.env.ANALYSIS_CACHE_TTL_MS) || 120_000;
const analysisCache = new Map();

const readCachedAnalysis = (appId) => {
    const cached = analysisCache.get(appId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) analysisCache.delete(appId);
    return null;
};

const isValidMetric = (metric) =>
    !!metric && typeof metric.event === "string" && metric.event.length > 0
    && typeof metric.screen === "string" && metric.screen.length > 0
    // `target` is optional, but when present it must be a usable string.
    && (metric.target == null
        || (typeof metric.target === "string" && metric.target.length > 0));

export const collectMetric = async (req, res) => {

    const metric = req.body;

    if (!isValidMetric(metric)) {
        return res.status(400).json({
            message: 'Invalid metric payload'
        });
    }

    try {

        await insertMetrics(req.appId, metric);

        publishMetric(req.appId, metric);

        return res.status(201).json({
            message: 'Metric collected successfully'
        });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

}

export const collectMetricsBatch = async (req, res) => {

    const metrics = req.body?.metrics;

    if (!Array.isArray(metrics) || metrics.length === 0) {
        return res.status(400).json({ message: 'metrics must be a non-empty array' });
    }

    if (metrics.length > MAX_BATCH_SIZE) {
        return res.status(400).json({ message: `metrics batch exceeds maximum of ${MAX_BATCH_SIZE}` });
    }

    if (!metrics.every(isValidMetric)) {
        return res.status(400).json({ message: 'Invalid metric payload' });
    }

    try {

        await insertMetricsBatch(req.appId, metrics);

        metrics.forEach((metric) => publishMetric(req.appId, metric));

        return res.status(201).json({
            message: `${metrics.length} metrics collected successfully`
        });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

}

export const getAggregatedMetrics = async (req, res) => {

    const { appId } = req.query;
    const userId = req.user.userId;

    if (!appId) {
        return res.status(400).json({ error: "appId is required" });
    }

    try {
        const app = await getAppMetrics(userId, appId);

        if (app.rows.length === 0) {
            return res.status(403).json({ error: "Access denied" });
        }

        const metrics = await getUserMetrics(appId);

        const summary = aggregator.aggregateByScreen(metrics);
        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Streams newly-ingested metrics for an app as Server-Sent Events so the
// dashboard can update in real time without polling.
export const streamMetrics = async (req, res) => {

    const { appId } = req.query;
    const userId = req.user.userId;

    if (!appId) {
        return res.status(400).json({ error: "appId is required" });
    }

    try {
        const app = await getAppMetrics(userId, appId);

        if (app.rows.length === 0) {
            return res.status(403).json({ error: "Access denied" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Proxies that buffer responses would defeat streaming entirely.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(': connected\n\n');

    let closed = false;

    const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        res.end();
    };

    // Writing to a socket the peer has already dropped throws; without this
    // guard the rejection would propagate out of an EventEmitter callback
    // and take down the process.
    const safeWrite = (chunk) => {
        if (closed) return;
        try {
            res.write(chunk);
        } catch {
            cleanup();
        }
    };

    const unsubscribe = subscribeToMetrics(appId, (metric) => {
        safeWrite(`data: ${JSON.stringify(metric)}\n\n`);
    });

    const heartbeat = setInterval(() => safeWrite(': ping\n\n'), 30_000);

    req.on('close', cleanup);
    res.on('error', cleanup);
}

const safeJsonParse = (text) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
};

export const analyzeMetrics = async (req, res) => {

    const { appId } = req.query;
    const userId = req.user.userId;

    if (!appId) {
        return res.status(400).json({ error: "appId is required" });
    }

    try {

        const app = await getAppMetrics(userId, appId);

        if (app.rows.length === 0) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Access is re-checked above on every request, so a cache hit can
        // never serve one user's analysis to another.
        const cached = readCachedAnalysis(appId);
        if (cached) {
            return res.status(200).json(cached);
        }

        const metrics = await getUserMetrics(appId);

        const aggregated = aggregator.aggregateByScreen(metrics);

        if (aggregated.length === 0) {
            return res.status(200).json({
                severity: "low",
                insights: [],
                recommendations: [],
                message: "No metrics available yet"
            });
        }

        const severity = calculateSeverity(aggregated);

        let insights = [];
        let recommendations = [];
        let aiSucceeded = false;

        try {
            const aiPayload = buildAIPayload(aggregated);
            const aiResponse = await analyzePerformance(aiPayload);
            const parsedResponse = safeJsonParse(aiResponse);

            if (parsedResponse) {
                insights = parsedResponse.issues ?? [];
                recommendations = parsedResponse.recommendations ?? [];
                aiSucceeded = true;
            } else {
                console.warn("AI returned non-JSON response:", aiResponse?.substring(0, 200));
            }
        } catch (aiError) {
            console.error("AI analysis error (non-fatal):", aiError);
        }

        const payload = { severity, insights, recommendations };

        // Only cache a complete result. Caching a degraded (AI-failed)
        // response would pin empty insights for the whole TTL.
        if (aiSucceeded) {
            analysisCache.set(appId, {
                value: payload,
                expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS,
            });
        }

        return res.status(200).json(payload);

    } catch (error) {
        console.error("analyzeMetrics error:", error);
        res.status(500).json({
            error: 'Analysis failed',
            detail: error.message,
        });
    }
}
