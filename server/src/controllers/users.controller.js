import { asyncHandler } from "../utils/asyncHandler.js";
import { updateMe, deleteMe } from "../services/users.service.js";

export const updateMeHandler = asyncHandler(async (req, res) => {
  const result = await updateMe(req.user.id, req.body);
  res.status(200).json(result);
});

export const deleteMeHandler = asyncHandler(async (req, res) => {
  await deleteMe(req.user.id);
  res.status(204).end();
});
