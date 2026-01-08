import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listCoursesHandler,
  createCourseHandler,
  updateCourseHandler,
  deleteCourseHandler,
} from "../controllers/courses.controller.js";

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

coursesRouter.get("/", listCoursesHandler);
coursesRouter.post("/", createCourseHandler);
coursesRouter.put("/:id", updateCourseHandler);
coursesRouter.delete("/:id", deleteCourseHandler);
