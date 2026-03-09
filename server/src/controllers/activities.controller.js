import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listActivities,
  getActivityForUser,
  createActivityForUser,
  updateActivityForUser,
  deleteActivityForUser,
} from "../services/activities.service.js";

export const listActivitiesHandler = asyncHandler(async (req, res) => {
  const activities = await listActivities(req.user.id, req.query);
  res.json({ activities });
});

export const getActivityHandler = asyncHandler(async (req, res) => {
  const activity = await getActivityForUser(req.user.id, req.params.id);
  res.json({ activity });
});

export const createActivityHandler = asyncHandler(async (req, res) => {
  const activity = await createActivityForUser(req.user.id, req.body);
  res.status(201).json({ activity });
});

export const updateActivityHandler = asyncHandler(async (req, res) => {
  const activity = await updateActivityForUser(req.user.id, req.params.id, req.body);
  res.json({ activity });
});

export const deleteActivityHandler = asyncHandler(async (req, res) => {
  await deleteActivityForUser(req.user.id, req.params.id);
  res.status(204).send();
});
