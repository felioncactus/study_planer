import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listTasksHandler,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  tasksSummaryHandler,
} from "../controllers/tasks.controller.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get("/summary", tasksSummaryHandler);

tasksRouter.get("/", listTasksHandler);
tasksRouter.post("/", createTaskHandler);
tasksRouter.put("/:id", updateTaskHandler);
tasksRouter.delete("/:id", deleteTaskHandler);
