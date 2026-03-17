import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listCourseNotesHandler,
  getCourseNoteHandler,
  createCourseNoteHandler,
  updateCourseNoteHandler,
  deleteCourseNoteHandler,
} from "../controllers/courseNotes.controller.js";

export const courseNotesRouter = Router();

courseNotesRouter.use(requireAuth);

courseNotesRouter.get("/courses/:courseId/notes", listCourseNotesHandler);
courseNotesRouter.post("/courses/:courseId/notes", createCourseNoteHandler);
courseNotesRouter.get("/notes/:noteId", getCourseNoteHandler);
courseNotesRouter.put("/notes/:noteId", updateCourseNoteHandler);
courseNotesRouter.delete("/notes/:noteId", deleteCourseNoteHandler);
