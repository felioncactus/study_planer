import { countPendingInboundForUser } from "../repositories/friends.repo.js";
import { listChatsForUser } from "../repositories/chats.repo.js";
import { subscribeUserStream } from "./realtime.service.js";

export async function getFriendNotifications(userId) {
  const [pendingRequests, chats] = await Promise.all([
    countPendingInboundForUser(userId),
    listChatsForUser(userId),
  ]);

  const unreadMessages = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);

  return {
    pendingRequests,
    unreadMessages,
    total: pendingRequests + unreadMessages,
  };
}

export async function openNotificationStream(req, res) {
  const userId = req.user.id;
  const snapshot = await getFriendNotifications(userId);

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const unsubscribe = subscribeUserStream(userId, res);

  res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);

  const ping = setInterval(() => {
    try {
      res.write("event: ping\ndata: {}\n\n");
    } catch {
      // connection cleanup below
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(ping);
    unsubscribe();
    try {
      res.end();
    } catch {
      // already closed
    }
  });
}