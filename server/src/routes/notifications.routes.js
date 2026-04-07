import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { friendNotificationsHandler, notificationStreamHandler } from "../controllers/notifications.controller.js";

export const notificationsRouter = Router();

// Counts for navbar badges (friends requests + unread 1:1 messages)
notificationsRouter.get("/friends", requireAuth, friendNotificationsHandler);

notificationsRouter.get("/stream", requireAuth, notificationStreamHandler);
