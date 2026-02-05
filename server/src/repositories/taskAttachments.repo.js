import { pool } from "../config/db.js";

export async function listTaskAttachments({ userId, taskId }) {
  const result = await pool.query(
    `SELECT id, task_id, user_id, COALESCE(original_name, original_filename) AS original_name, COALESCE(original_filename, original_name) AS original_filename, COALESCE(stored_name, stored_filename) AS stored_name, COALESCE(stored_filename, stored_name) AS stored_filename, mime_type, size_bytes, stored_path, created_at
     FROM task_attachments
     WHERE user_id = $1 AND task_id = $2
     ORDER BY created_at DESC;`,
    [userId, taskId]
  );
  return result.rows;
}

export async function createTaskAttachment({
  userId,
  taskId,
  originalName,
  storedName,
  mimeType,
  sizeBytes,
  storedPath,
}) {
  const result = await pool.query(
    `INSERT INTO task_attachments (user_id, task_id, original_name, original_filename, stored_name, stored_filename, mime_type, size_bytes, stored_path)
     VALUES ($1, $2, $3, $3, $4, $4, $5, $6, $7)
     RETURNING id, task_id, user_id, COALESCE(original_name, original_filename) AS original_name, COALESCE(original_filename, original_name) AS original_filename, COALESCE(stored_name, stored_filename) AS stored_name, COALESCE(stored_filename, stored_name) AS stored_filename, mime_type, size_bytes, stored_path, created_at;`,
    [userId, taskId, originalName, storedName, mimeType ?? null, sizeBytes ?? 0, storedPath]
  );
  return result.rows[0];
}

export async function getTaskAttachmentById({ userId, attachmentId }) {
  const result = await pool.query(
    `SELECT id, task_id, user_id, COALESCE(original_name, original_filename) AS original_name, COALESCE(original_filename, original_name) AS original_filename, COALESCE(stored_name, stored_filename) AS stored_name, COALESCE(stored_filename, stored_name) AS stored_filename, mime_type, size_bytes, stored_path, created_at
     FROM task_attachments
     WHERE user_id = $1 AND id = $2
     LIMIT 1;`,
    [userId, attachmentId]
  );
  return result.rows[0] || null;
}

export async function deleteTaskAttachment({ userId, attachmentId }) {
  const result = await pool.query(
    `DELETE FROM task_attachments
     WHERE user_id = $1 AND id = $2
     RETURNING id, task_id, stored_path;`,
    [userId, attachmentId]
  );
  return result.rows[0] || null;
}
