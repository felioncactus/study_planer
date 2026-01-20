import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { listMessagesHandler, sendMessageHandler } from "../controllers/messages.controller.js";

export const messagesRouter = Router();

messagesRouter.get("/:friendId", requireAuth, listMessagesHandler);
messagesRouter.post("/:friendId", requireAuth, sendMessageHandler);
