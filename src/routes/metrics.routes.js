import express from "express";
import {
  collectMetric,
  getAllMetrics,
  getAggregatedMetrics,
  analyzeMetrics,
} from "../controllers/metrics.controllers.js";

import { appAuthMiddleware } from "../middlewares/appAuth.middleware.js";

const router = express.Router();

router.get('/', appAuthMiddleware, getAllMetrics);

router.post('/', appAuthMiddleware, collectMetric);

router.get('/summary', appAuthMiddleware, getAggregatedMetrics);

router.post('/analyze', appAuthMiddleware, analyzeMetrics);

export default router;