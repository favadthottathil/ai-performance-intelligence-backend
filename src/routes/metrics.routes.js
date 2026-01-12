  import express from "express";
  import {
    healthCheck,
    collectMetric,
    getAllMetrics,
    getAggregatedMetrics,
    analyzeMetrics,
  } from "../controllers/metrics.controllers.js";

  import { authMiddleware } from "../middlewares/auth.middlewares.js";

  const router = express.Router();

  router.get('/health', healthCheck);

  router.get('/', authMiddleware, getAllMetrics);

  router.post('/', authMiddleware, collectMetric);

  router.get('/summary', authMiddleware, getAggregatedMetrics);

  router.post('/analyze', authMiddleware, analyzeMetrics);

  export default router;