import "dotenv/config";

import pool from "./src/config/db.js";
import express from "express";
import cors from "cors";
import metricsRoutes from "./src/routes/metrics.routes.js";
import authRoutes from "./src/routes/auth.routes.js";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

app.use("/metrics", metricsRoutes);

app.use("/auth", authRoutes);

pool.query("SELECT 1")
  .then(() => console.log("✅ DB connected"))
  .catch(console.error);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});




export default app;


