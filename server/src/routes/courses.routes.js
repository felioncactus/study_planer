import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { courseUpload } from "../middleware/upload.middleware.js";
import {
  listCoursesHandler,
  getCourseHandler,
  createCourseHandler,
  updateCourseHandler,
  deleteCourseHandler,
} from "../controllers/courses.controller.js";

export const coursesRouter = Router();

coursesRouter.use(requireAuth);

coursesRouter.get("/", listCoursesHandler);
coursesRouter.get("/:id", getCourseHandler);

// multipart form-data (supports course image + banner)
const uploadFields = courseUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

coursesRouter.post("/", uploadFields, createCourseHandler);
coursesRouter.put("/:id", uploadFields, updateCourseHandler);
coursesRouter.delete("/:id", deleteCourseHandler);
