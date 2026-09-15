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

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/metrics", metricsRoutes);
app.use("/auth", authRoutes);
app.use("/apps", appsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Network-level failures reaching Postgres. DNS errors (ENOTFOUND/EAI_AGAIN)
// belong here too: a briefly unresolvable DB host is an availability problem,
// not a defect in the request, and answering 500 would tell a caller not to
// retry something that is in fact retryable.
const DB_FAULT_CODES = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
]);

// Terminal error handler. Express 5 forwards rejected async handlers here, so
// a transient DB fault becomes a logged 503 rather than an unhandled rejection
// that can tear down the process mid-ingestion.
// eslint-disable-next-line no-unused-vars -- Express identifies the error
// handler by its four-parameter arity; dropping `next` silently disables it.
app.use((err, _req, res, _next) => {
  const isDbFault =
    DB_FAULT_CODES.has(err?.code) ||
    err?.code?.startsWith?.("08"); // Postgres connection-exception class

  const status = isDbFault ? 503 : 500;

  console.error("Unhandled request error:", err);

  res.status(status).json({
    error: isDbFault ? "Service temporarily unavailable" : "Internal server error",
  });
});

export default app;
