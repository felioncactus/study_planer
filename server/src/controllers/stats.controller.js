
import { asyncHandler } from "../utils/asyncHandler.js";
import { getStatsForUser } from "../services/stats.service.js";

export const getStatsHandler = asyncHandler(async (req, res) => {
  const stats = await getStatsForUser(req.user.id);
  res.json({ stats });
});
