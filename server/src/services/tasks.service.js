import { z } from "zod";
import { badRequest, notFound } from "../utils/httpError.js";
import {
  courseExistsForUser,
  createTask,
  deleteTask,
  getTaskByIdForUser,
  listTasksByUserId,
  setTaskCourseId,
  updateTask,
  getTaskSummaryByUserId,
} from "../repositories/tasks.repo.js";
import { createCalendarBlocksBulk } from "../repositories/calendarBlocks.repo.js";
import { suggestTaskSchedule } from "./taskSuggestions.service.js";

const statusEnum = z.enum(["todo", "doing", "done"]);

// Accept either YYYY-MM-DD or an ISO datetime string and normalize to YYYY-MM-DD.
function normalizeDateOnly(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (v === "") return null;

  if (v instanceof Date) return v.toISOString().slice(0, 10);

  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
    return s;
  }

  return v;
}

function serializeDateOnlyOut(v) {
  if (v === null || v === undefined || v === "") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  return v;
}

function serializeTask(task) {
  if (!task) return task;
  return { ...task, due_date: serializeDateOnlyOut(task.due_date) };
}


function normalizeBody(input) {
  return {
    title: input.title,
    description: input.description,
    due_date: normalizeDateOnly(input.due_date ?? input.dueDate),
    status: input.status,
    course_id: input.course_id ?? input.courseId,
    estimated_minutes: input.estimated_minutes ?? input.estimatedMinutes,
    priority: input.priority,
    splittable: input.splittable,
    planned_start_at: input.planned_start_at ?? input.plannedStartAt,
    planned_end_at: input.planned_end_at ?? input.plannedEndAt,
  };
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  due_date: z.preprocess(normalizeDateOnly, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  status: statusEnum.optional().default("todo"),
  course_id: z.string().uuid().optional().nullable(),
  estimated_minutes: z.number().int().min(1).max(24 * 60).optional().default(60),
  priority: z.number().int().min(1).max(5).optional().default(3),
  splittable: z.boolean().optional().default(true),
  planned_start_at: z.string().optional().nullable(),
  planned_end_at: z.string().optional().nullable(),
});

const updateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    due_date: z.preprocess(normalizeDateOnly, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
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
  from: z.preprocess(normalizeDateOnly, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  to: z.preprocess(normalizeDateOnly, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  courseId: z.string().uuid().optional(),
});

export async function listTasks(userId, query) {
  const parsed = listSchema.safeParse(query);
  if (!parsed.success) {
    throw badRequest("Invalid query parameters", "VALIDATION_ERROR");
  }
  const rows = await listTasksByUserId(userId, parsed.data);
  return rows.map(serializeTask);
}

export async function getTaskForUser(userId, taskId) {
  const row = await getTaskByIdForUser({ userId, taskId });
  if (!row) throw notFound("Task not found", "TASK_NOT_FOUND");
  return serializeTask(row);
}

export async function createTaskForUser(userId, body) {
  const normalized = normalizeBody(body);
  const parsed = createSchema.safeParse(normalized);
  if (!parsed.success) {
    throw badRequest("Invalid task payload", "VALIDATION_ERROR");
  }

  const { title, description, due_date, status, course_id, estimated_minutes, priority, splittable, planned_start_at, planned_end_at } = parsed.data;

  if (course_id) {
    const ok = await courseExistsForUser({ courseId: course_id, userId });
    if (!ok) {
      throw badRequest("course_id does not belong to user", "INVALID_COURSE");
    }
  }

  const created = await createTask({
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

  // Optional: if the client picked a planned slot, create a matching calendar block.
  if (planned_start_at && planned_end_at) {
    await createCalendarBlocksBulk(userId, [
      {
        task_id: created.id,
        type: "task",
        title: created.title,
        start_at: planned_start_at,
        end_at: planned_end_at,
        is_fixed: false,
        source: "manual",
        meta: { kind: "planned" },
      },
    ]);
  }

  return serializeTask(created);
}

export async function updateTaskForUser(userId, taskId, body) {
  const normalized = normalizeBody(body);
  const parsed = updateSchema.safeParse(normalized);
  if (!parsed.success) {
    throw badRequest("Invalid task payload", "VALIDATION_ERROR");
  }

  const { title, description, due_date, status, course_id, estimated_minutes, priority, splittable, planned_start_at, planned_end_at } = parsed.data;

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

    return serializeTask(updated2 || updated);
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

  return serializeTask(updated);
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


export async function getTaskSuggestionsForUser(userId, body) {
  // body: { dueDate?, estimatedMinutes?, horizonDays? }
  return await suggestTaskSchedule(userId, body);
}
