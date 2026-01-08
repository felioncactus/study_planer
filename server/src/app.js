import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    })
  );
  app.use(express.json());

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use("/api", apiRouter);

  // error handler last
  app.use(errorMiddleware);

  return app;
}
