
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getStatsHandler } from "../controllers/stats.controller.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);
statsRouter.get("/", getStatsHandler);
