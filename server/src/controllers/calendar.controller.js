import { asyncHandler } from "../utils/asyncHandler.js";
import { listCalendarEventsForUser } from "../services/calendar.service.js";

export const listCalendarEventsHandler = asyncHandler(async (req, res) => {
  const data = await listCalendarEventsForUser(req.user.id, req.query);
  res.json(data);
});
