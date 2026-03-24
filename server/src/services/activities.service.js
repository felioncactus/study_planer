import { z } from "zod";
import { badRequest, notFound } from "../utils/httpError.js";
import {
  createActivity,
  deleteActivity,
  getActivityByIdForUser,
  listActivitiesByUserId,
  updateActivity,
} from "../repositories/activities.repo.js";

const IsoSchema = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid ISO datetime");

const createSchema = z.object({
  title: z.string().min(1).max(200),
  startAt: IsoSchema,
  endAt: IsoSchema,
  description: z.string().max(5000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  startAt: IsoSchema.optional(),
  endAt: IsoSchema.optional(),
  description: z.string().max(5000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
});

const listSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

function toMeta(input) {
  return {
    description: input.description ?? null,
    location: input.location ?? null,
  };
}

export async function listActivities(userId, query) {
  const { from, to } = listSchema.parse(query ?? {});
  const activities = await listActivitiesByUserId(userId, { from, to });
  return activities;
}

export async function getActivityForUser(userId, id) {
  const a = await getActivityByIdForUser(userId, id);
  if (!a) throw notFound("Activity not found", "ACTIVITY_NOT_FOUND");
  return a;
}

export async function createActivityForUser(userId, body) {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw badRequest("Invalid activity payload", "VALIDATION_ERROR");

  const { title, startAt, endAt } = parsed.data;
  if (new Date(endAt) <= new Date(startAt)) throw badRequest("endAt must be after startAt", "INVALID_TIME_RANGE");

  return await createActivity(userId, { title: title.trim(), startAt, endAt, meta: toMeta(parsed.data) });
}

export async function updateActivityForUser(userId, id, body) {
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) throw badRequest("Invalid activity payload", "VALIDATION_ERROR");

  if (parsed.data.startAt && parsed.data.endAt && new Date(parsed.data.endAt) <= new Date(parsed.data.startAt)) {
    throw badRequest("endAt must be after startAt", "INVALID_TIME_RANGE");
  }

  const updated = await updateActivity(userId, id, {
    title: parsed.data.title?.trim(),
    startAt: parsed.data.startAt,
    endAt: parsed.data.endAt,
    meta: parsed.data.description !== undefined || parsed.data.location !== undefined ? toMeta(parsed.data) : undefined,
  });

  if (!updated) throw notFound("Activity not found", "ACTIVITY_NOT_FOUND");
  return updated;
}

export async function deleteActivityForUser(userId, id) {
  const deletedId = await deleteActivity(userId, id);
  if (!deletedId) throw notFound("Activity not found", "ACTIVITY_NOT_FOUND");
}


export async function aiPlanActivityForUser(userId, body) {
  const title = String(body?.title || "").trim();
  const description = typeof body?.description === "string" ? body.description : "";
  const estimatedMinutes = Number(body?.estimatedMinutes ?? body?.estimated_minutes ?? 60);
  const preferredDate = body?.preferredDate ?? body?.preferred_date ?? null;

  if (!title) throw badRequest("title is required", "VALIDATION_ERROR");

  const { aiPlanTaskForUser } = await import("./aiPlanner.service.js");
  return await aiPlanTaskForUser(userId, {
    title,
    description,
    dueDate: preferredDate,
    estimatedMinutes,
    horizonDays: body?.horizonDays ?? 7,
    studyWindow: body?.studyWindow,
  });
}
