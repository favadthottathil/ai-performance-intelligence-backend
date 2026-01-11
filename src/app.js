import express from "express";
import cors from "cors";
import metricsRoutes from "./routes/metrics.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/metrics", metricsRoutes);

app.use("/auth", authRoutes);

export default app;

