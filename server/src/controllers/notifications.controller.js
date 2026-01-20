import { asyncHandler } from "../utils/asyncHandler.js";
import { getFriendNotifications } from "../services/notifications.service.js";

export const friendNotificationsHandler = asyncHandler(async (req, res) => {
  const data = await getFriendNotifications(req.user.id);
  res.json(data);
});
