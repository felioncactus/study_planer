import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app.js";
import { closeDb } from "./config/db.js";

const app = createApp();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
});
