import { asyncHandler } from "../utils/asyncHandler.js";
import { listChatMessages, sendChatMessage } from "../services/messages.service.js";

export const listMessagesHandler = asyncHandler(async (req, res) => {
  const messages = await listChatMessages(req.user.id, req.params.friendId);
  res.json({ messages });
});

export const sendMessageHandler = asyncHandler(async (req, res) => {
  const { body } = req.body;
  const message = await sendChatMessage(req.user.id, req.params.friendId, body);
  res.status(201).json({ message });
});
