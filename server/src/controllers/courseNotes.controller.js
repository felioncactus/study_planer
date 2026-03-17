import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listNotesForCourse,
  getNoteForUser,
  createNoteForCourse,
  updateNoteForUser,
  deleteNoteForUser,
} from "../services/courseNotes.service.js";

export const listCourseNotesHandler = asyncHandler(async (req, res) => {
  const notes = await listNotesForCourse(req.user.id, req.params.courseId);
  res.json({ notes });
});

export const getCourseNoteHandler = asyncHandler(async (req, res) => {
  const note = await getNoteForUser(req.user.id, req.params.noteId);
  res.json({ note });
});

export const createCourseNoteHandler = asyncHandler(async (req, res) => {
  const note = await createNoteForCourse(req.user.id, req.params.courseId, req.body);
  res.status(201).json({ note });
});

export const updateCourseNoteHandler = asyncHandler(async (req, res) => {
  const note = await updateNoteForUser(req.user.id, req.params.noteId, req.body);
  res.json({ note });
});

export const deleteCourseNoteHandler = asyncHandler(async (req, res) => {
  await deleteNoteForUser(req.user.id, req.params.noteId);
  res.status(204).send();
});
