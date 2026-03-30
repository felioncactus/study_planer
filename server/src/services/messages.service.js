
import { getFriendship } from "../repositories/friends.repo.js";
import { openDirectChat, listChatMessagesForUser, sendChatMessageForUser } from "./chats.service.js";
import { forbidden } from "../utils/httpError.js";

function ensureCanChat(rel, meId, otherUserId) {
  if (meId === otherUserId) return;
  if (!rel) throw forbidden("Not friends");
  if (rel.status === "blocked") throw forbidden("Chat is blocked");
  if (rel.status !== "accepted") throw forbidden("Friend request not accepted");
}

export async function listChatMessages(meId, otherUserId) {
  const rel = await getFriendship(meId, otherUserId);
  ensureCanChat(rel, meId, otherUserId);
  const chat = await openDirectChat(meId, otherUserId);
  return await listChatMessagesForUser(meId, chat.id);
}

export async function sendChatMessage(meId, otherUserId, body, files = []) {
  const rel = await getFriendship(meId, otherUserId);
  ensureCanChat(rel, meId, otherUserId);
  const chat = await openDirectChat(meId, otherUserId);
  return await sendChatMessageForUser(meId, chat.id, { body, files });
}
