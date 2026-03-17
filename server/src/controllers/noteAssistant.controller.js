import { asyncHandler } from "../utils/asyncHandler.js";
import { getNoteAiHelp } from "../services/noteAssistant.service.js";

export const noteAssistantHelpHandler = asyncHandler(async (req, res) => {
  const result = await getNoteAiHelp(req.user.id, req.body || {});
  res.json(result);
});
