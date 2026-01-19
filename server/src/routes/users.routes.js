import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { updateMeHandler, deleteMeHandler } from "../controllers/users.controller.js";

export const usersRouter = Router();

usersRouter.patch("/me", requireAuth, updateMeHandler);
usersRouter.delete("/me", requireAuth, deleteMeHandler);
