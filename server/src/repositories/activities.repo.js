import { pool } from "../config/db.js";

export async function listActivitiesByUserId(userId, { from, to } = {}) {
  const where = ["user_id = $1", "type = 'activity'"];
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

  const result = await pool.query(
    `
    SELECT id, title, start_at, end_at, is_fixed, source, meta, created_at, updated_at
    FROM calendar_blocks
    WHERE ${where.join(" AND ")}
    ORDER BY start_at ASC;
    `,
    values
  );

  return result.rows;
}

export async function createActivity(userId, { title, startAt, endAt, meta }) {
  const result = await pool.query(
    `
    INSERT INTO calendar_blocks (user_id, task_id, type, title, start_at, end_at, is_fixed, source, meta)
    VALUES ($1, NULL, 'activity', $2, $3, $4, true, 'manual', $5::jsonb)
    RETURNING id, title, start_at, end_at, is_fixed, source, meta, created_at, updated_at;
    `,
    [userId, title, startAt, endAt, JSON.stringify(meta ?? {})]
  );
  return result.rows[0];
}

export async function getActivityByIdForUser(userId, activityId) {
  const result = await pool.query(
    `
    SELECT id, title, start_at, end_at, is_fixed, source, meta, created_at, updated_at
    FROM calendar_blocks
    WHERE id = $1 AND user_id = $2 AND type = 'activity';
    `,
    [activityId, userId]
  );
  return result.rows[0] ?? null;
}

export async function updateActivity(userId, activityId, { title, startAt, endAt, meta }) {
  const sets = [];
  const values = [activityId, userId];
  let i = 3;

  if (title !== undefined) {
    sets.push(`title = $${i++}`);
    values.push(title);
  }
  if (startAt !== undefined) {
    sets.push(`start_at = $${i++}`);
    values.push(startAt);
  }
  if (endAt !== undefined) {
    sets.push(`end_at = $${i++}`);
    values.push(endAt);
  }
  if (meta !== undefined) {
    sets.push(`meta = $${i++}::jsonb`);
    values.push(JSON.stringify(meta));
  }

  if (!sets.length) {
    const cur = await getActivityByIdForUser(userId, activityId);
    return cur;
  }

  const result = await pool.query(
    `
    UPDATE calendar_blocks
    SET ${sets.join(", ")}, updated_at = NOW()
    WHERE id = $1 AND user_id = $2 AND type = 'activity'
    RETURNING id, title, start_at, end_at, is_fixed, source, meta, created_at, updated_at;
    `,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteActivity(userId, activityId) {
  const result = await pool.query(
    `
    DELETE FROM calendar_blocks
    WHERE id = $1 AND user_id = $2 AND type = 'activity'
    RETURNING id;
    `,
    [activityId, userId]
  );
  return result.rows[0]?.id ?? null;
}
