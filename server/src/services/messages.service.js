import { badRequest, forbidden } from "../utils/httpError.js";
import { getFriendship } from "../repositories/friends.repo.js";
import { createMessage, listMessagesBetween, markMessagesRead } from "../repositories/messages.repo.js";

function ensureCanChat(rel, meId) {
  if (!rel) throw forbidden("Not friends");
  if (rel.status === "blocked") throw forbidden("Chat is blocked");
  if (rel.status !== "accepted") throw forbidden("Friend request not accepted");
}

export async function listChatMessages(meId, otherUserId) {
  const rel = await getFriendship(meId, otherUserId);
  ensureCanChat(rel, meId);
  // Mark unread messages from the other user as read when this chat is opened/fetched.
  await markMessagesRead(meId, otherUserId);
  return await listMessagesBetween(meId, otherUserId, { limit: 200 });
}

export async function sendChatMessage(meId, otherUserId, body) {
  const rel = await getFriendship(meId, otherUserId);
  ensureCanChat(rel, meId);

  const text = (body || "").toString().trim();
  if (!text) throw badRequest("Message body is required");
  if (text.length > 2000) throw badRequest("Message too long");

  return await createMessage(meId, otherUserId, text);
}
