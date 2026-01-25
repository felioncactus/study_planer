import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listCourses,
  getCourseForUser,
  createCourseForUser,
  updateCourseForUser,
  deleteCourseForUser,
} from "../services/courses.service.js";

function pickUploadedUrls(req) {
  const files = req.files || {};
  const image = Array.isArray(files.image) ? files.image[0] : null;
  const banner = Array.isArray(files.banner) ? files.banner[0] : null;

  const imageUrl = image ? `/uploads/courses/${image.filename}` : undefined;
  const bannerUrl = banner ? `/uploads/courses/${banner.filename}` : undefined;

  return { imageUrl, bannerUrl };
}

export const listCoursesHandler = asyncHandler(async (req, res) => {
  const courses = await listCourses(req.user.id);
  res.json({ courses });
});

export const getCourseHandler = asyncHandler(async (req, res) => {
  const course = await getCourseForUser(req.user.id, req.params.id);
  res.json({ course });
});

export const createCourseHandler = asyncHandler(async (req, res) => {
  const { imageUrl, bannerUrl } = pickUploadedUrls(req);
  const course = await createCourseForUser(req.user.id, { ...req.body, imageUrl, bannerUrl });
  res.status(201).json({ course });
});

export const updateCourseHandler = asyncHandler(async (req, res) => {
  const { imageUrl, bannerUrl } = pickUploadedUrls(req);
  const course = await updateCourseForUser(req.user.id, req.params.id, { ...req.body, imageUrl, bannerUrl });
  res.json({ course });
});

export const deleteCourseHandler = asyncHandler(async (req, res) => {
  await deleteCourseForUser(req.user.id, req.params.id);
  res.status(204).send();
});
