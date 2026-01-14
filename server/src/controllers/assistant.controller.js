import { asyncHandler } from "../utils/asyncHandler.js";
import { runAssistantForUser } from "../services/assistant.service.js";

export const assistantMessageHandler = asyncHandler(async (req, res) => {
  const { messages } = req.body;
  const result = await runAssistantForUser(req.user.id, messages);
  res.json({ message: result.text });
});
