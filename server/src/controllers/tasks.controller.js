import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createTaskForUser,
  deleteTaskForUser,
  listTasks,
  getTaskForUser,
  updateTaskForUser,
  getSummaryForUser,
} from "../services/tasks.service.js";
import {
  addAttachmentsToTask,
  listAttachmentsForTask,
  removeAttachment,
} from "../services/taskAttachments.service.js";

export const listTasksHandler = asyncHandler(async (req, res) => {
  const tasks = await listTasks(req.user.id, req.query);
  res.json({ tasks });
});

export const getTaskHandler = asyncHandler(async (req, res) => {
  const task = await getTaskForUser(req.user.id, req.params.id);
  res.json({ task });
});

export const createTaskHandler = asyncHandler(async (req, res) => {
  const task = await createTaskForUser(req.user.id, req.body);
  res.status(201).json({ task });
});

export const updateTaskHandler = asyncHandler(async (req, res) => {
  const task = await updateTaskForUser(req.user.id, req.params.id, req.body);
  res.json({ task });
});

export const deleteTaskHandler = asyncHandler(async (req, res) => {
  await deleteTaskForUser(req.user.id, req.params.id);
  res.status(204).send();
});

export const tasksSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getSummaryForUser(req.user.id);
  res.json({ summary });
});

export const addTaskAttachmentsHandler = asyncHandler(async (req, res) => {
  const attachments = await addAttachmentsToTask({
    userId: req.user.id,
    taskId: req.params.id,
    files: req.files ?? [],
  });
  res.status(201).json({ attachments });
});

export const listTaskAttachmentsHandler = asyncHandler(async (req, res) => {
  const attachments = await listAttachmentsForTask({
    userId: req.user.id,
    taskId: req.params.id,
  });
  res.json({ attachments });
});

export const deleteTaskAttachmentHandler = asyncHandler(async (req, res) => {
  await removeAttachment({ userId: req.user.id, attachmentId: req.params.attachmentId });
  res.status(204).send();
});
