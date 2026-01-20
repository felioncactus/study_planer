import { countPendingInboundForUser } from "../repositories/friends.repo.js";
import { countUnreadMessagesForUser } from "../repositories/messages.repo.js";

export async function getFriendNotifications(userId) {
  const [pendingRequests, unreadMessages] = await Promise.all([
    countPendingInboundForUser(userId),
    countUnreadMessagesForUser(userId),
  ]);

  return {
    pendingRequests,
    unreadMessages,
    total: pendingRequests + unreadMessages,
  };
}
