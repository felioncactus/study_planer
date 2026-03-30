
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { chatAttachmentsUpload } from "../middleware/chatAttachmentsUpload.middleware.js";
import { listMessagesHandler, sendMessageHandler } from "../controllers/messages.controller.js";

export const messagesRouter = Router();

messagesRouter.get("/:friendId", requireAuth, listMessagesHandler);
messagesRouter.post("/:friendId", requireAuth, chatAttachmentsUpload.array("attachments", 5), sendMessageHandler);
