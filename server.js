import "dotenv/config";

import pool from "./src/config/db.js";
import app from "./src/app.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const PORT = process.env.PORT || 3000;

pool.query("SELECT 1")
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB connection failed:", err.message));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
