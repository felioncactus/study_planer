
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { chatAttachmentsUpload } from "../middleware/chatAttachmentsUpload.middleware.js";
import {
  clearChatHandler,
  createGroupChatHandler,
  createPollHandler,
  votePollHandler,
  createTimerHandler,
  deleteChatHandler,
  deleteChatMessageHandler,
  editChatMessageHandler,
  getChatHandler,
  listChatMessagesHandler,
  listChatsHandler,
  openDirectChatHandler,
  selfChatHandler,
  sendChatMessageHandler,
} from "../controllers/chats.controller.js";

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

chatsRouter.get("/", listChatsHandler);
chatsRouter.get("/self", selfChatHandler);
chatsRouter.post("/direct/:userId", openDirectChatHandler);
chatsRouter.post("/group", createGroupChatHandler);
chatsRouter.get("/:chatId", getChatHandler);
chatsRouter.delete("/:chatId", deleteChatHandler);
chatsRouter.delete("/:chatId/messages", clearChatHandler);
chatsRouter.get("/:chatId/messages", listChatMessagesHandler);
chatsRouter.post("/:chatId/messages", chatAttachmentsUpload.array("attachments", 5), sendChatMessageHandler);
chatsRouter.post("/:chatId/polls", createPollHandler);
chatsRouter.post("/:chatId/polls/:messageId/vote", votePollHandler);
chatsRouter.post("/:chatId/timers", createTimerHandler);
chatsRouter.patch("/:chatId/messages/:messageId", editChatMessageHandler);
chatsRouter.delete("/:chatId/messages/:messageId", deleteChatMessageHandler);
