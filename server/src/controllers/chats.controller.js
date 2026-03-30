
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  clearChatForUser,
  createGroupChatForUser,
  deleteChatForUser,
  deleteChatMessageForUser,
  editChatMessageForUser,
  getChatDetail,
  getSelfChat,
  listChatMessagesForUser,
  listMyChats,
  openDirectChat,
  sendChatMessageForUser,
} from "../services/chats.service.js";

export const listChatsHandler = asyncHandler(async (req, res) => {
  const chats = await listMyChats(req.user.id);
  res.json({ chats });
});

export const selfChatHandler = asyncHandler(async (req, res) => {
  const chat = await getSelfChat(req.user.id);
  res.json({ chat });
});

export const openDirectChatHandler = asyncHandler(async (req, res) => {
  const chat = await openDirectChat(req.user.id, req.params.userId);
  res.json({ chat });
});

export const getChatHandler = asyncHandler(async (req, res) => {
  const chat = await getChatDetail(req.user.id, req.params.chatId);
  res.json({ chat });
});

export const listChatMessagesHandler = asyncHandler(async (req, res) => {
  const messages = await listChatMessagesForUser(req.user.id, req.params.chatId);
  res.json({ messages });
});

export const sendChatMessageHandler = asyncHandler(async (req, res) => {
  const message = await sendChatMessageForUser(req.user.id, req.params.chatId, {
    body: req.body?.body,
    files: req.files || [],
  });
  res.status(201).json({ message });
});

export const editChatMessageHandler = asyncHandler(async (req, res) => {
  const message = await editChatMessageForUser(req.user.id, req.params.chatId, req.params.messageId, {
    body: req.body?.body,
  });
  res.json({ message });
});

export const deleteChatMessageHandler = asyncHandler(async (req, res) => {
  await deleteChatMessageForUser(req.user.id, req.params.chatId, req.params.messageId);
  res.json({ ok: true });
});

export const clearChatHandler = asyncHandler(async (req, res) => {
  await clearChatForUser(req.user.id, req.params.chatId);
  res.json({ ok: true });
});

export const deleteChatHandler = asyncHandler(async (req, res) => {
  await deleteChatForUser(req.user.id, req.params.chatId);
  res.json({ ok: true });
});

export const createGroupChatHandler = asyncHandler(async (req, res) => {
  const chat = await createGroupChatForUser(req.user.id, {
    title: req.body?.title,
    memberIds: req.body?.memberIds,
  });
  res.status(201).json({ chat });
});
