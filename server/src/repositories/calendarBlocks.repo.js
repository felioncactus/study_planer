import { pool } from "../config/db.js";

export async function listCalendarBlocksByUserId(userId, { from, to } = {}) {
  const where = ["user_id = $1"];
  const values = [userId];
  let i = 2;

  if (from) {
    where.push(`end_at >= $${i++}`); // block overlaps window
    values.push(from);
  }
  if (to) {
    where.push(`start_at <= $${i++}`);
    values.push(to);
  }

  const result = await pool.query(
    `
    SELECT id, user_id, task_id, type, title, start_at, end_at, is_fixed, source, meta, created_at, updated_at
    FROM calendar_blocks
    WHERE ${where.join(" AND ")}
    ORDER BY start_at ASC;
    `,
    values
  );

  return result.rows;
}

export async function deleteCalendarBlocksByUserId(userId, { from, to, source, type } = {}) {
  const where = ["user_id = $1"];
  const values = [userId];
  let i = 2;

  if (from) {
    where.push(`end_at >= $${i++}`);
    values.push(from);
  }
  if (to) {
    where.push(`start_at <= $${i++}`);
    values.push(to);
  }
  if (source) {
    where.push(`source = $${i++}`);
    values.push(source);
  }
  if (type) {
    where.push(`type = $${i++}`);
    values.push(type);
  }

  const result = await pool.query(
    `
    DELETE FROM calendar_blocks
    WHERE ${where.join(" AND ")}
    RETURNING id;
    `,
    values
  );

  return result.rows.map((r) => r.id);
}

export async function createCalendarBlocksBulk(userId, blocks) {
  if (!blocks || blocks.length === 0) return [];

  // Build multi-row insert
  const cols = ["user_id", "task_id", "type", "title", "start_at", "end_at", "is_fixed", "source", "meta"];
  const values = [];
  const placeholders = [];
  let i = 1;

  for (const b of blocks) {
    placeholders.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`
    );
    values.push(
      userId,
      b.task_id ?? null,
      b.type,
      b.title,
      b.start_at,
      b.end_at,
      b.is_fixed ?? false,
      b.source ?? "manual",
      b.meta ?? {}
    );
  }

  const result = await pool.query(
    `
    INSERT INTO calendar_blocks (${cols.join(", ")})
    VALUES ${placeholders.join(", ")}
    RETURNING id, user_id, task_id, type, title, start_at, end_at, is_fixed, source, meta, created_at, updated_at;
    `,
    values
  );

  return result.rows;
}


export async function deleteCalendarBlocksByTaskIds(userId, taskIds) {
  const ids = Array.isArray(taskIds)
    ? taskIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [String(taskIds || "").trim()].filter(Boolean);

  if (!ids.length) return [];

  const result = await pool.query(
    `
    DELETE FROM calendar_blocks
    WHERE user_id = $1
      AND task_id = ANY($2::uuid[])
    RETURNING id;
    `,
    [userId, ids]
  );

  return result.rows.map((row) => row.id);
}
