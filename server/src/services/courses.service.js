import { z } from "zod";
import { conflict, notFound, badRequest } from "../utils/httpError.js";
import {
  listCoursesByUserId,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../repositories/courses.repo.js";

const courseUpsertSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(50).optional().nullable(),
});

export async function listCourses(userId) {
  return await listCoursesByUserId(userId);
}

export async function createCourseForUser(userId, input) {
  const parsed = courseUpsertSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest("Invalid course payload", "VALIDATION_ERROR");
  }

  try {
    return await createCourse({
      userId,
      name: parsed.data.name.trim(),
      color: parsed.data.color ?? null,
    });
  } catch (err) {
    // unique(user_id, name) in DB -> duplicate course name for the same user
    if (err && err.code === "23505") {
      throw conflict("Course name already exists", "COURSE_NAME_TAKEN");
    }
    throw err;
  }
}

export async function updateCourseForUser(userId, courseId, input) {
  const parsed = courseUpsertSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest("Invalid course payload", "VALIDATION_ERROR");
  }

  try {
    const updated = await updateCourse({
      courseId,
      userId,
      name: parsed.data.name.trim(),
      color: parsed.data.color ?? null,
    });

    if (!updated) {
      throw notFound("Course not found", "COURSE_NOT_FOUND");
    }

    return updated;
  } catch (err) {
    if (err && err.code === "23505") {
      throw conflict("Course name already exists", "COURSE_NAME_TAKEN");
    }
    throw err;
  }
}

export async function deleteCourseForUser(userId, courseId) {
  const deleted = await deleteCourse({ userId, courseId });
  if (!deleted) {
    throw notFound("Course not found", "COURSE_NOT_FOUND");
  }
  return deleted;
}
