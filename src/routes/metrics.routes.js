import express from "express";
import {
  collectMetric,
  getAllMetrics,
  getAggregatedMetrics,
  analyzeMetrics,
} from "../controllers/metrics.controllers.js";

import { appAuthMiddleware } from "../middlewares/appAuth.middleware.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// router.get('/', appAuthMiddleware, getAllMetrics);

router.post('/', appAuthMiddleware, collectMetric);

router.get('/summary', authMiddleware, getAggregatedMetrics);

router.get('/analyze', authMiddleware, analyzeMetrics);

export default router;