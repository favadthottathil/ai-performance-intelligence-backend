import express from "express";
import cors from "cors";
import metricsRoutes from "./routes/metrics.routes.js";
import authRoutes from "./routes/auth.routes.js";
import appsRoutes from "./routes/apps.routes.js";

const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:8080",
  "https://ai-performance-intelligence-dashboa.vercel.app",
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : DEFAULT_ORIGINS;

const app = express();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use("/metrics", metricsRoutes);
app.use("/auth", authRoutes);
app.use("/apps", appsRoutes);

export default app;
