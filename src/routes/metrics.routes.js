import express from "express";
import {
  collectMetric,
  collectMetricsBatch,
  getAggregatedMetrics,
  streamMetrics,
  analyzeMetrics,
} from "../controllers/metrics.controllers.js";

import { appAuthMiddleware } from "../middlewares/appAuth.middleware.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { metricsRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post('/', metricsRateLimiter, appAuthMiddleware, collectMetric);

router.post('/batch', metricsRateLimiter, appAuthMiddleware, collectMetricsBatch);

router.get('/stream', authMiddleware, streamMetrics);

router.get('/summary', authMiddleware, getAggregatedMetrics);

router.get('/analyze', authMiddleware, analyzeMetrics);

export default router;
