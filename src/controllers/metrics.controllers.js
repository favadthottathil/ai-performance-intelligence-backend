import metricStore from "../services/metrics.store.js";
import aggregator from "../services/metrics.aggregator.js";
import { buildAIPayload } from "../services/ai.payload.builder.js";
import { analyzePerformance } from "../services/gemini.service.js";
import { calculateSeverity } from "../services/severity.scorer.js";

export const healthCheck = (req, res) => {
    res.status(200).json({
        status: 'Backend is running 🚀',
    });
};

// put for add metrics
export const collectMetric = (req, res) => {

    const metric = req.body;

    if (!metric.event || !metric.screen || !metric.timestamp) {

        return res.status(400).json({
            message: 'Invalid metric payload'
        });
    }

    metricStore.addMetric(metric);

    return res.status(201).json({
        message: 'Metric collected successfully'
    });
}

export const getAllMetrics = (req, res) => {
    const metrics = metricStore.getAllMetrics();
    res.status(200).json(metrics);
}

export const getAggregatedMetrics = (req, res) => {
    const summary = aggregator.aggregateByScreen();
    res.status(200).json(summary);
}

const safeJsonParse = (text) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
};

export const analyzeMetrics = async (req, res) => {
    try {

        const aggregated = aggregator.aggregateByScreen();

        if (aggregated.length === 0) {

            return res.status(400).json({
                message: 'No metrics to analyze'
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


