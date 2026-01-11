import "dotenv/config";

import pool from "./src/config/db.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

pool.query("SELECT 1")
  .then(() => console.log("✅ DB connected"))
  .catch(console.error);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
