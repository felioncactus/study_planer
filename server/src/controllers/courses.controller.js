import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listCourses,
  createCourseForUser,
  updateCourseForUser,
  deleteCourseForUser,
} from "../services/courses.service.js";

export const listCoursesHandler = asyncHandler(async (req, res) => {
  const courses = await listCourses(req.user.id);
  res.json({ courses });
});

export const createCourseHandler = asyncHandler(async (req, res) => {
  const course = await createCourseForUser(req.user.id, req.body);
  res.status(201).json({ course });
});

export const updateCourseHandler = asyncHandler(async (req, res) => {
  const course = await updateCourseForUser(req.user.id, req.params.id, req.body);
  res.json({ course });
});

export const deleteCourseHandler = asyncHandler(async (req, res) => {
  await deleteCourseForUser(req.user.id, req.params.id);
  res.status(204).send();
});
