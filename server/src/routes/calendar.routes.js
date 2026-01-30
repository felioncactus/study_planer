import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { listCalendarEventsHandler } from "../controllers/calendar.controller.js";

export const calendarRouter = Router();

calendarRouter.use(requireAuth);

calendarRouter.get("/events", listCalendarEventsHandler);
