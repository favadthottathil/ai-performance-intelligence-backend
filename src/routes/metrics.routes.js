import express from "express";
import {
  healthCheck,
  collectMetric,
  getAllMetrics,
  getAggregatedMetrics,
  analyzeMetrics,
} from "../controllers/metrics.controllers.js";

const router = express.Router();

router.get('/health', healthCheck);

router.get('/', getAllMetrics);

router.post('/',collectMetric);

router.get('/summary', getAggregatedMetrics);

router.post('/analyze', analyzeMetrics);

export default router;