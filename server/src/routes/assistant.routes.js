import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { assistantMessageHandler } from "../controllers/assistant.controller.js";

export const assistantRouter = Router();

assistantRouter.use(requireAuth);

// POST /api/assistant/message
assistantRouter.post("/message", assistantMessageHandler);
