import fs from "fs";
import path from "path";
import { badRequest, notFound } from "../utils/httpError.js";
import { getTaskByIdForUser } from "../repositories/tasks.repo.js";
import {
  createTaskAttachment,
  deleteTaskAttachment,
  getTaskAttachmentById,
  listTaskAttachments,
} from "../repositories/taskAttachments.repo.js";

function resolveUploadsDir() {
  const cwd = process.cwd();
  const direct = path.resolve(cwd, "uploads");
  const nested = path.resolve(cwd, "server", "uploads");
  if (fs.existsSync(direct)) return direct;
  if (fs.existsSync(nested)) return nested;
  return direct;
}

const UPLOADS_DIR = resolveUploadsDir();

function toPublicUrl(storedPath) {
  // storedPath is relative under uploads/, e.g. tasks/<taskId>/<file>
  return `/uploads/${storedPath.replace(/^\/+/, "")}`;
}

function serializeAttachment(a) {
  return { ...a, url: toPublicUrl(a.stored_path) };
}

export async function addAttachmentsToTask({ userId, taskId, files }) {
  if (!files || files.length === 0) return [];

  const task = await getTaskByIdForUser({ userId, taskId });
  if (!task) throw notFound("Task not found", "TASK_NOT_FOUND");

  const created = [];
  for (const f of files) {
    if (!f?.filename || !f?.path) continue;

    // Convert absolute file path to stored path relative to uploads/
    const storedPath = path
      .relative(UPLOADS_DIR, f.path)
      .split(path.sep)
      .join("/");

    const row = await createTaskAttachment({
      userId,
      taskId,
      originalName: f.originalname,
      storedName: f.filename,
      mimeType: f.mimetype,
      sizeBytes: f.size,
      storedPath,
    });
    created.push(serializeAttachment(row));
  }

  return created;
}

export async function listAttachmentsForTask({ userId, taskId }) {
  const task = await getTaskByIdForUser({ userId, taskId });
  if (!task) throw notFound("Task not found", "TASK_NOT_FOUND");

  const rows = await listTaskAttachments({ userId, taskId });
  return rows.map(serializeAttachment);
}

export async function removeAttachment({ userId, attachmentId }) {
  const existing = await getTaskAttachmentById({ userId, attachmentId });
  if (!existing) throw notFound("Attachment not found", "ATTACHMENT_NOT_FOUND");

  const deleted = await deleteTaskAttachment({ userId, attachmentId });
  if (!deleted) throw notFound("Attachment not found", "ATTACHMENT_NOT_FOUND");

  // best-effort delete file
  const abs = path.resolve(UPLOADS_DIR, deleted.stored_path);
  try {
    await fs.promises.unlink(abs);
  } catch {
    // ignore
  }

  return { id: deleted.id };
}
