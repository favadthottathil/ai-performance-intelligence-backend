import { insertMetrics, insertMetricsBatch, getUserMetrics, getAppMetrics } from "../repositories/metrics.repository.js";
import * as aggregator from "../services/metrics.aggregator.js";
import { buildAIPayload } from "../services/ai.payload.builder.js";
import { analyzePerformance } from "../services/gemini.service.js";
import { calculateSeverity } from "../services/severity.scorer.js";
import { publishMetric, subscribeToMetrics } from "../services/metrics.events.js";

const MAX_BATCH_SIZE = 500;

const isValidMetric = (metric) =>
    !!metric && typeof metric.event === "string" && metric.event.length > 0
    && typeof metric.screen === "string" && metric.screen.length > 0;

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
    res.flushHeaders();

    res.write(': connected\n\n');

    const unsubscribe = subscribeToMetrics(appId, (metric) => {
        res.write(`data: ${JSON.stringify(metric)}\n\n`);
    });

    const heartbeat = setInterval(() => res.write(': ping\n\n'), 30_000);

    req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
        res.end();
    });
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
        let aiDebug = null;

        try {
            const aiPayload = buildAIPayload(aggregated);
            const aiResponse = await analyzePerformance(aiPayload);
            const parsedResponse = safeJsonParse(aiResponse);

            if (parsedResponse) {
                insights = parsedResponse.issues ?? [];
                recommendations = parsedResponse.recommendations ?? [];
            } else {
                aiDebug = `non-JSON AI response: ${aiResponse?.substring(0, 300)}`;
                console.warn("AI returned non-JSON response:", aiResponse?.substring(0, 200));
            }
        } catch (aiError) {
            aiDebug = `${aiError.name}: ${aiError.message}`;
            console.error("AI analysis error (non-fatal):", aiError);
        }

        return res.status(200).json({
            severity,
            insights,
            recommendations,
            ...(aiDebug && { aiDebug }),
        });

    } catch (error) {
        console.error("analyzeMetrics error:", error);
        res.status(500).json({
            error: 'Analysis failed',
            detail: error.message,
        });
    }
}
