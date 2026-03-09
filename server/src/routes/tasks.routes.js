import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { taskAttachmentsUpload } from "../middleware/taskAttachmentsUpload.middleware.js";
import {
  listTasksHandler,
  getTaskHandler,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  tasksSummaryHandler,
  taskSuggestionsHandler,
  addTaskAttachmentsHandler,
  listTaskAttachmentsHandler,
  deleteTaskAttachmentHandler,
} from "../controllers/tasks.controller.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get("/summary", tasksSummaryHandler);

// Draft task scheduling suggestions (calendar heatmap + best slots)
tasksRouter.post("/suggestions", taskSuggestionsHandler);

tasksRouter.get("/", listTasksHandler);
tasksRouter.get("/:id", getTaskHandler);
tasksRouter.post("/", createTaskHandler);

tasksRouter.get("/:id/attachments", listTaskAttachmentsHandler);
tasksRouter.post("/:id/attachments", taskAttachmentsUpload.array("files", 10), addTaskAttachmentsHandler);
tasksRouter.delete("/:id/attachments/:attachmentId", deleteTaskAttachmentHandler);
tasksRouter.put("/:id", updateTaskHandler);
tasksRouter.delete("/:id", deleteTaskHandler);
