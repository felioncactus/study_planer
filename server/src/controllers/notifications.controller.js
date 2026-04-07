import { asyncHandler } from "../utils/asyncHandler.js";
import { getFriendNotifications, openNotificationStream } from "../services/notifications.service.js";

export const friendNotificationsHandler = asyncHandler(async (req, res) => {
  const data = await getFriendNotifications(req.user.id);
  res.json(data);
});


export const notificationStreamHandler = asyncHandler(async (req, res) => {
  await openNotificationStream(req, res);
});
