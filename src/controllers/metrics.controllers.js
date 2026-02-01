import { insertMetrics, getUserMetrics, getAppMetrics } from "../repositories/metrics.repository.js";
import aggregator from "../services/metrics.aggregator.js";
import { buildAIPayload } from "../services/ai.payload.builder.js";
import { analyzePerformance } from "../services/gemini.service.js";
import { calculateSeverity } from "../services/severity.scorer.js";

// put for add metrics
export const collectMetric = async (req, res) => {

    const metric = req.body;

    const apiToken = req.headers['x-api-key'];

    console.log(apiToken);

    if (!metric.event || !metric.screen) {

        return res.status(400).json({
            message: 'Invalid metric payload'
        });
    }

    try {

        // console.log(req.appId, req.user.userId);

        await insertMetrics(req.appId, req.body);

        return res.status(201).json({
            message: 'Metric collected successfully'
        });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

}

export const getAllMetrics = async (req, res) => {
    const metrics = await getUserMetrics(req.appId, req.user.userId);
    res.status(200).json(metrics);
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

        const summary = await aggregator.aggregateByScreen(metrics);
        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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

    try {

        const app = await getAppMetrics(userId, appId);

        if (app.rows.length === 0) {
            return res.status(403).json({ error: "Access denied" });
        }

        const metrics = await getUserMetrics(appId);

        const aggregated = await aggregator.aggregateByScreen(metrics);

        if (aggregated.length === 0) {
            return res.status(200).json({
                severity: "low",
                insights: [],
                recommendations: [],
                message: "No metrics available yet"
            });
        }

        const aiPayload =
            buildAIPayload(aggregated);

        const aiResponse =
            await analyzePerformance(aiPayload);

        const parsedResponse = safeJsonParse(aiResponse);

        if (!parsedResponse) {
            return res.status(500).json({
                error: 'Invalid AI response format',
            });
        }

        const severity = calculateSeverity(aggregated);

        res.status(200).json({
            severity,
            insights: parsedResponse.issues,
            recommendations: parsedResponse.recommendations,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'AI analysis failed',
        });
    }
}


