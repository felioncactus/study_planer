
import { countPendingInboundForUser } from "../repositories/friends.repo.js";
import { listChatsForUser } from "../repositories/chats.repo.js";

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
