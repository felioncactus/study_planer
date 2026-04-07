
import path from "path";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { getFriendship } from "../repositories/friends.repo.js";
import { findUserById } from "../repositories/users.repo.js";
import {
  addAttachments,
  clearChatMessages,
  createGroupChat,
  createMessage,
  deleteChatById,
  deleteMessageById,
  getChatById,
  getMessageById,
  getOrCreateDirectChat,
  isParticipant,
  listChatsForUser,
  listMessagesByChatId,
  listParticipantsByChatId,
  markChatRead,
  updateMessage,
} from "../repositories/chats.repo.js";
import { askChatBot } from "./chatBot.service.js";
import { publishUserEventMany } from "./realtime.service.js";

function ensureFriendshipForDirect(rel, meId, otherUserId) {
  if (meId === otherUserId) return;
  if (!rel) throw forbidden("You can only open direct chats with accepted friends");
  if (rel.status === "blocked") throw forbidden("Chat is blocked");
  if (rel.status !== "accepted") throw forbidden("Friend request not accepted");
}

function publicAttachment(file) {
  const base = path.basename(file.path || file.filename || "");
  return {
    file_url: `/uploads/chat/${base}`,
    storage_path: file.path,
    original_filename: file.originalname || base,
    mime_type: file.mimetype || null,
    size_bytes: file.size || null,
  };
}


function messagePreview(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean.length > 140 ? `${clean.slice(0, 137)}...` : clean;
}

function normalizeChat(chat, participants, meId) {
  const others = participants.filter((p) => p.user_id !== meId);
  let displayTitle = chat.title;
  if (!displayTitle) {
    if (chat.type === "self") {
      displayTitle = "Notes to self";
    } else if (chat.type === "direct") {
      const other = others[0];
      displayTitle = other?.name || other?.email || "Direct chat";
    } else {
      displayTitle = "Group chat";
    }
  }
  return {
    ...chat,
    title: displayTitle,
    participants: participants.map((p) => ({
      id: p.user_id,
      user_id: p.user_id,
      email: p.email,
      name: p.name,
      avatar_url: p.avatar_url,
      joined_at: p.joined_at,
      last_read_at: p.last_read_at,
    })),
  };
}

export async function listMyChats(meId) {
  const chats = await listChatsForUser(meId);
  return chats.map((chat) => {
    const participants = Array.isArray(chat.participants) ? chat.participants : [];
    const normalizedParticipants = participants.map((p) => ({
      id: p.id,
      user_id: p.id,
      email: p.email,
      name: p.name,
      avatar_url: p.avatar_url,
    }));
    const self = normalizedParticipants.find((p) => p.id === meId);
    const others = normalizedParticipants.filter((p) => p.id !== meId);
    const title =
      chat.title ||
      (chat.type === "self"
        ? "Notes to self"
        : chat.type === "direct"
          ? others[0]?.name || others[0]?.email || "Direct chat"
          : "Group chat");
    return {
      id: chat.id,
      type: chat.type,
      title,
      created_by: chat.created_by,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      last_message_body: chat.last_message_body,
      last_message_at: chat.last_message_at,
      unread_count: chat.unread_count || 0,
      participants: normalizedParticipants,
      self,
      others,
    };
  });
}

export async function openDirectChat(meId, otherUserId) {
  const other = await findUserById(otherUserId);
  if (!other) throw notFound("User not found");
  const rel = await getFriendship(meId, otherUserId);
  ensureFriendshipForDirect(rel, meId, otherUserId);
  const chat = await getOrCreateDirectChat(meId, otherUserId);
  const participants = await listParticipantsByChatId(chat.id);
  return normalizeChat(chat, participants, meId);
}

export async function getSelfChat(meId) {
  const chat = await getOrCreateDirectChat(meId, meId, { type: "self", title: "Notes to self", createdBy: meId });
  const participants = await listParticipantsByChatId(chat.id);
  return normalizeChat(chat, participants, meId);
}

export async function getChatDetail(meId, chatId) {
  const chat = await getChatById(chatId);
  if (!chat) throw notFound("Chat not found");
  const participant = await isParticipant(chatId, meId);
  if (!participant) throw forbidden("You are not a participant of this chat");
  const participants = await listParticipantsByChatId(chatId);
  return normalizeChat(chat, participants, meId);
}

export async function listChatMessagesForUser(meId, chatId) {
  await getChatDetail(meId, chatId);
  await markChatRead(chatId, meId);
  const rows = await listMessagesByChatId(chatId, { limit: 300 });
  const participants = await listParticipantsByChatId(chatId);
  const byId = new Map(participants.map((p) => [p.user_id, p]));
  return rows.map((m) => ({
    ...m,
    sender_name: m.sender_kind === "bot" ? "Bot" : byId.get(m.sender_id)?.name || byId.get(m.sender_id)?.email || "Unknown",
    sender_avatar_url: m.sender_kind === "bot" ? null : byId.get(m.sender_id)?.avatar_url || null,
  }));
}

export async function sendChatMessageForUser(meId, chatId, { body, files = [] }) {
  const chat = await getChatDetail(meId, chatId);
  const text = (body || "").toString();
  const trimmed = text.trim();
  const isBotCommand = trimmed.startsWith("/bot");
  const botQuestion = isBotCommand ? trimmed.replace(/^\/bot\s*/, "").trim() : "";

  if (!trimmed && !files.length) {
    throw badRequest("Message body or attachment is required");
  }
  if (trimmed.length > 4000) {
    throw badRequest("Message too long");
  }
  if (isBotCommand && !botQuestion) {
    throw badRequest("Use /bot followed by a question");
  }

  const message = await createMessage(chat.id, {
    senderId: meId,
    senderKind: "user",
    body: text,
    metadata: {
      formatting: "markdown-lite",
      has_attachments: files.length > 0,
      bot_command: isBotCommand,
    },
  });

  const attachments = await addAttachments(message.id, files.map(publicAttachment));
  const participants = await listParticipantsByChatId(chat.id);

  const recipientIds = participants
    .map((p) => p.user_id)
    .filter((userId) => String(userId) !== String(meId));

  publishUserEventMany(
    recipientIds,
    "chat.message",
    () => ({
      chatId: chat.id,
      title: chat.title || "Chat",
      body: text,
      preview: messagePreview(text || (attachments.length ? "Attachment" : "")),
      senderId: meId,
      senderName: participants.find((p) => p.user_id === meId)?.name || participants.find((p) => p.user_id === meId)?.email || "User",
      messageId: message.id,
      incoming: true,
    })
  );

  if (isBotCommand) {
    const history = await listChatMessagesForUser(meId, chat.id);
    const asker = participants.find((p) => p.user_id === meId);
    const botReply = await askChatBot({
      chatTitle: chat.title,
      participants,
      history,
      question: botQuestion,
      askerName: asker?.name || asker?.email || "User",
    });
    const botMessage = await createMessage(chat.id, {
      senderId: null,
      senderKind: "bot",
      body: botReply,
      metadata: {
        trigger_message_id: message.id,
      },
    });

    publishUserEventMany(
      participants.map((p) => p.user_id),
      "chat.message",
      {
        chatId: chat.id,
        title: chat.title || "Chat",
        body: botReply,
        preview: messagePreview(botReply),
        senderId: null,
        senderName: "Bot",
        messageId: botMessage.id,
        incoming: true,
      }
    );
  }

  return {
    ...message,
    attachments,
  };
}

export async function editChatMessageForUser(meId, chatId, messageId, { body }) {
  const chat = await getChatDetail(meId, chatId);
  const cleanBody = (body || "").toString().trim();
  if (!cleanBody) throw badRequest("Message body is required");
  if (cleanBody.length > 4000) throw badRequest("Message too long");

  const message = await getMessageById(messageId);
  if (!message || message.chat_id !== chat.id) throw notFound("Message not found");
  if (message.sender_kind !== "user" || message.sender_id !== meId) {
    throw forbidden("You can only edit your own messages");
  }

  const updated = await updateMessage(messageId, { body: cleanBody });
  return updated;
}

export async function deleteChatMessageForUser(meId, chatId, messageId) {
  const chat = await getChatDetail(meId, chatId);
  const message = await getMessageById(messageId);
  if (!message || message.chat_id !== chat.id) throw notFound("Message not found");
  if (message.sender_kind !== "user" || message.sender_id !== meId) {
    throw forbidden("You can only delete your own messages");
  }
  await deleteMessageById(messageId);
  return { ok: true };
}

export async function clearChatForUser(meId, chatId) {
  await getChatDetail(meId, chatId);
  await clearChatMessages(chatId);
  return { ok: true };
}

export async function deleteChatForUser(meId, chatId) {
  const chat = await getChatDetail(meId, chatId);
  if (chat.type === "group" && chat.created_by && chat.created_by !== meId) {
    throw forbidden("Only the group creator can delete this chat");
  }
  await deleteChatById(chatId);
  return { ok: true };
}

export async function createGroupChatForUser(meId, { title, memberIds }) {
  const cleanTitle = (title || "").trim();
  if (!cleanTitle) throw badRequest("Group title is required");
  const uniqueIds = [...new Set([meId, ...(Array.isArray(memberIds) ? memberIds : [])])];
  if (uniqueIds.length < 2) throw badRequest("Group chat must include at least one more participant");

  for (const userId of uniqueIds) {
    const user = await findUserById(userId);
    if (!user) throw notFound(`User not found: ${userId}`);
    if (userId !== meId) {
      const rel = await getFriendship(meId, userId);
      ensureFriendshipForDirect(rel, meId, userId);
    }
  }

  const chat = await createGroupChat({
    title: cleanTitle,
    createdBy: meId,
    participantIds: uniqueIds,
  });
  const participants = await listParticipantsByChatId(chat.id);
  return normalizeChat(chat, participants, meId);
}
