import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listActivitiesHandler,
  getActivityHandler,
  createActivityHandler,
  updateActivityHandler,
  deleteActivityHandler,
  aiPlanActivityHandler,
} from "../controllers/activities.controller.js";

export const activitiesRouter = Router();

activitiesRouter.use(requireAuth);

activitiesRouter.post("/ai-plan", aiPlanActivityHandler);
activitiesRouter.get("/", listActivitiesHandler);
activitiesRouter.get("/:id", getActivityHandler);
activitiesRouter.post("/", createActivityHandler);
activitiesRouter.put("/:id", updateActivityHandler);
activitiesRouter.delete("/:id", deleteActivityHandler);
