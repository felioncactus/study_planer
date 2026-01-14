import { z } from "zod";
import { badRequest, notFound } from "../utils/httpError.js";
import {
  courseExistsForUser,
  createTask,
  deleteTask,
  listTasksByUserId,
  setTaskCourseId,
  updateTask,
  getTaskSummaryByUserId,
} from "../repositories/tasks.repo.js";

const statusEnum = z.enum(["todo", "doing", "done"]);

function normalizeBody(input) {
  return {
    title: input.title,
    description: input.description,
    due_date: input.due_date ?? input.dueDate,
    status: input.status,
    course_id: input.course_id ?? input.courseId,
    estimated_minutes: input.estimated_minutes ?? input.estimatedMinutes,
    priority: input.priority,
    splittable: input.splittable,
  };
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: statusEnum.optional().default("todo"),
  course_id: z.string().uuid().optional().nullable(),
  estimated_minutes: z.number().int().min(1).max(24 * 60).optional().default(60),
  priority: z.number().int().min(1).max(5).optional().default(3),
  splittable: z.boolean().optional().default(true),
});

const updateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    status: statusEnum.optional(),
    course_id: z.string().uuid().optional().nullable(),
    estimated_minutes: z.number().int().min(1).max(24 * 60).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    splittable: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field is required",
  });

const listSchema = z.object({
  status: statusEnum.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  courseId: z.string().uuid().optional(),
});

export async function listTasks(userId, query) {
  const parsed = listSchema.safeParse(query);
  if (!parsed.success) {
    throw badRequest("Invalid query parameters", "VALIDATION_ERROR");
  }
  return await listTasksByUserId(userId, parsed.data);
}

export async function createTaskForUser(userId, body) {
  const normalized = normalizeBody(body);
  const parsed = createSchema.safeParse(normalized);
  if (!parsed.success) {
    throw badRequest("Invalid task payload", "VALIDATION_ERROR");
  }

  const { title, description, due_date, status, course_id, estimated_minutes, priority, splittable } = parsed.data;

  if (course_id) {
    const ok = await courseExistsForUser({ courseId: course_id, userId });
    if (!ok) {
      throw badRequest("course_id does not belong to user", "INVALID_COURSE");
    }
  }

  return await createTask({
    userId,
    courseId: course_id ?? null,
    title: title.trim(),
    description: description ?? null,
    dueDate: due_date ?? null,
    status,
    estimatedMinutes: estimated_minutes,
    priority,
    splittable,
  });
}

export async function updateTaskForUser(userId, taskId, body) {
  const normalized = normalizeBody(body);
  const parsed = updateSchema.safeParse(normalized);
  if (!parsed.success) {
    throw badRequest("Invalid task payload", "VALIDATION_ERROR");
  }

  const { title, description, due_date, status, course_id, estimated_minutes, priority, splittable } = parsed.data;

  if (Object.prototype.hasOwnProperty.call(parsed.data, "course_id")) {
    if (course_id) {
      const ok = await courseExistsForUser({ courseId: course_id, userId });
      if (!ok) {
        throw badRequest("course_id does not belong to user", "INVALID_COURSE");
      }
    }

    const updated = await setTaskCourseId({
      taskId,
      userId,
      courseId: course_id ?? null,
    });

    if (!updated) {
      throw notFound("Task not found", "TASK_NOT_FOUND");
    }

    const updated2 = await updateTask({
      taskId,
      userId,
      courseId: undefined,
      title: title ?? undefined,
      description: Object.prototype.hasOwnProperty.call(parsed.data, "description")
        ? (description ?? null)
        : undefined,
      dueDate: Object.prototype.hasOwnProperty.call(parsed.data, "due_date")
        ? (due_date ?? null)
        : undefined,
      status: status ?? undefined,
    });

    return updated2 || updated;
  }

  const updated = await updateTask({
    taskId,
    userId,
    courseId: undefined,
    title: title ?? undefined,
    description: Object.prototype.hasOwnProperty.call(parsed.data, "description")
      ? (description ?? null)
      : undefined,
    dueDate: Object.prototype.hasOwnProperty.call(parsed.data, "due_date")
      ? (due_date ?? null)
      : undefined,
    status: status ?? undefined,
    estimatedMinutes: Object.prototype.hasOwnProperty.call(parsed.data, "estimated_minutes")
      ? estimated_minutes
      : undefined,
    priority: Object.prototype.hasOwnProperty.call(parsed.data, "priority")
      ? priority
      : undefined,
    splittable: Object.prototype.hasOwnProperty.call(parsed.data, "splittable")
      ? splittable
      : undefined,
  });

  if (!updated) {
    throw notFound("Task not found", "TASK_NOT_FOUND");
  }

  return updated;
}

export async function deleteTaskForUser(userId, taskId) {
  const deleted = await deleteTask({ userId, taskId });
  if (!deleted) {
    throw notFound("Task not found", "TASK_NOT_FOUND");
  }
  return deleted;
}

export async function getSummaryForUser(userId) {
  return await getTaskSummaryByUserId(userId);
}
