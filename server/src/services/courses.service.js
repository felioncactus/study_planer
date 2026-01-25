import { z } from "zod";
import { conflict, notFound, badRequest } from "../utils/httpError.js";
import {
  listCoursesByUserId,
  getCourseByIdForUser,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../repositories/courses.repo.js";

const emptyToUndefined = (v) => {
  if (v === "" || v === null) return undefined;
  return v;
};

const emptyToNull = (v) => {
  if (v === "" || v === null) return null;
  return v;
};

const dayEnum = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be HH:MM")
  .transform((s) => s);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .transform((s) => s);

// For updates we want to support clearing optional fields (send "" -> null)
// and still reject invalid formats. For create, optional fields can be omitted.
const courseUpsertSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().min(1).max(100)),
  color: z.preprocess(emptyToNull, z.string().max(50).nullable()).optional(),
  description: z.preprocess(emptyToNull, z.string().max(2000).nullable()).optional(),
  dayOfWeek: z.preprocess(emptyToNull, dayEnum.nullable()).optional(),
  startTime: z.preprocess(emptyToNull, timeString.nullable()).optional(),
  endTime: z.preprocess(emptyToNull, timeString.nullable()).optional(),
  midtermDate: z.preprocess(emptyToNull, dateString.nullable()).optional(),
  finalDate: z.preprocess(emptyToNull, dateString.nullable()).optional(),
  imageUrl: z.preprocess(emptyToNull, z.string().max(500).nullable()).optional(),
  bannerUrl: z.preprocess(emptyToNull, z.string().max(500).nullable()).optional(),
});

function toNull(v) {
  return v === undefined ? null : v;
}

export async function listCourses(userId) {
  return await listCoursesByUserId(userId);
}

export async function getCourseForUser(userId, courseId) {
  const course = await getCourseByIdForUser({ userId, courseId });
  if (!course) throw notFound("Course not found", "COURSE_NOT_FOUND");
  return course;
}

export async function createCourseForUser(userId, input) {
  const parsed = courseUpsertSchema.safeParse({
    name: input?.name,
    color: input?.color,
    description: input?.description,
    dayOfWeek: input?.dayOfWeek ?? input?.day_of_week,
    startTime: input?.startTime ?? input?.start_time,
    endTime: input?.endTime ?? input?.end_time,
    midtermDate: input?.midtermDate ?? input?.midterm_date,
    finalDate: input?.finalDate ?? input?.final_date,
    imageUrl: input?.imageUrl ?? input?.image_url,
    bannerUrl: input?.bannerUrl ?? input?.banner_url,
  });

  if (!parsed.success) {
    throw badRequest("Invalid course payload", "VALIDATION_ERROR");
  }

  try {
    return await createCourse({
      userId,
      name: parsed.data.name.trim(),
      color: toNull(parsed.data.color),
      description: toNull(parsed.data.description),
      dayOfWeek: toNull(parsed.data.dayOfWeek),
      startTime: toNull(parsed.data.startTime),
      endTime: toNull(parsed.data.endTime),
      midtermDate: toNull(parsed.data.midtermDate),
      finalDate: toNull(parsed.data.finalDate),
      imageUrl: toNull(parsed.data.imageUrl),
      bannerUrl: toNull(parsed.data.bannerUrl),
    });
  } catch (err) {
    if (err && err.code === "23505") {
      throw conflict("Course name already exists", "COURSE_NAME_TAKEN");
    }
    throw err;
  }
}

export async function updateCourseForUser(userId, courseId, input) {
  const hasImageUrl = Object.prototype.hasOwnProperty.call(input || {}, "imageUrl") || Object.prototype.hasOwnProperty.call(input || {}, "image_url");
  const hasBannerUrl = Object.prototype.hasOwnProperty.call(input || {}, "bannerUrl") || Object.prototype.hasOwnProperty.call(input || {}, "banner_url");

  const parsed = courseUpsertSchema.safeParse({
    name: input?.name,
    color: input?.color,
    description: input?.description,
    dayOfWeek: input?.dayOfWeek ?? input?.day_of_week,
    startTime: input?.startTime ?? input?.start_time,
    endTime: input?.endTime ?? input?.end_time,
    midtermDate: input?.midtermDate ?? input?.midterm_date,
    finalDate: input?.finalDate ?? input?.final_date,
    imageUrl: input?.imageUrl ?? input?.image_url,
    bannerUrl: input?.bannerUrl ?? input?.banner_url,
  });

  if (!parsed.success) {
    throw badRequest("Invalid course payload", "VALIDATION_ERROR");
  }

  try {
    const updated = await updateCourse({
      courseId,
      userId,
      name: parsed.data.name.trim(),
      color: toNull(parsed.data.color),
      description: toNull(parsed.data.description),
      dayOfWeek: toNull(parsed.data.dayOfWeek),
      startTime: toNull(parsed.data.startTime),
      endTime: toNull(parsed.data.endTime),
      midtermDate: toNull(parsed.data.midtermDate),
      finalDate: toNull(parsed.data.finalDate),
      imageUrlProvided: hasImageUrl,
      imageUrl: hasImageUrl ? toNull(parsed.data.imageUrl) : undefined,
      bannerUrlProvided: hasBannerUrl,
      bannerUrl: hasBannerUrl ? toNull(parsed.data.bannerUrl) : undefined,
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
