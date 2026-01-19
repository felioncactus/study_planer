import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

function parseOrigins(value) {
  if (!value) return ["http://localhost:5173"];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function createApp() {
  const app = express();

  const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN);

  const corsOptions = {
    origin(origin, cb) {
      // allow non-browser clients (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  // Express 5 + path-to-regexp does NOT accept '*' for routes; use a regex for preflight.
  app.options(/.*/, cors(corsOptions));

  app.use(express.json({ limit: "3mb" }));

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use("/api", apiRouter);

  // error handler last
  app.use(errorMiddleware);

  return app;
}
