import { pool } from "../config/db.js";

export async function courseExistsForUser({ courseId, userId }) {
  const result = await pool.query(
    `SELECT 1
     FROM courses
     WHERE id = $1 AND user_id = $2
     LIMIT 1;`,
    [courseId, userId]
  );
  return result.rowCount > 0;
}

export async function listTasksByUserId(userId, filters) {
  const where = ["user_id = $1"];
  const values = [userId];
  let i = 2;

  if (filters.status) {
    where.push(`status = $${i++}`);
    values.push(filters.status);
  }
  if (filters.courseId) {
    where.push(`course_id = $${i++}`);
    values.push(filters.courseId);
  }
  if (filters.from) {
    where.push(`due_date >= $${i++}`);
    values.push(filters.from);
  }
  if (filters.to) {
    where.push(`due_date <= $${i++}`);
    values.push(filters.to);
  }

  const result = await pool.query(
    `SELECT id, user_id, course_id, title, description, due_date, status, estimated_minutes, priority, splittable, created_at, updated_at
     FROM tasks
     WHERE ${where.join(" AND ")}
     ORDER BY
       (due_date IS NULL) ASC,
       due_date ASC,
       created_at DESC;`,
    values
  );

  return result.rows;
}

export async function createTask({
  userId,
  courseId,
  title,
  description,
  dueDate,
  status,
  estimatedMinutes,
  priority,
  splittable,
}) {
  const result = await pool.query(
    `INSERT INTO tasks (user_id, course_id, title, description, due_date, status, estimated_minutes, priority, splittable)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, user_id, course_id, title, description, due_date, status, estimated_minutes, priority, splittable, created_at, updated_at;`,
    [
      userId,
      courseId ?? null,
      title,
      description ?? null,
      dueDate ?? null,
      status,
      estimatedMinutes,
      priority,
      splittable,
    ]
  );
  return result.rows[0];
}

export async function updateTask({
  taskId,
  userId,
  courseId,
  title,
  description,
  dueDate,
  status,
  estimatedMinutes,
  priority,
  splittable,
}) {
  const result = await pool.query(
    `UPDATE tasks
     SET
       course_id = COALESCE($3, course_id),
       title = COALESCE($4, title),
       description = COALESCE($5, description),
       due_date = COALESCE($6, due_date),
       status = COALESCE($7, status),
       estimated_minutes = COALESCE($8, estimated_minutes),
       priority = COALESCE($9, priority),
       splittable = COALESCE($10, splittable)
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, course_id, title, description, due_date, status, estimated_minutes, priority, splittable, created_at, updated_at;`,
    [
      taskId,
      userId,
      courseId,
      title,
      description,
      dueDate,
      status,
      estimatedMinutes,
      priority,
      splittable,
    ]
  );

  return result.rows[0] || null;
}

export async function setTaskCourseId({ taskId, userId, courseId }) {
  const result = await pool.query(
    `UPDATE tasks
     SET course_id = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, course_id, title, description, due_date, status, estimated_minutes, priority, splittable, created_at, updated_at;`,
    [taskId, userId, courseId]
  );
  return result.rows[0] || null;
}

export async function deleteTask({ taskId, userId }) {
  const result = await pool.query(
    `DELETE FROM tasks
     WHERE id = $1 AND user_id = $2
     RETURNING id;`,
    [taskId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Summary counts for dashboard.
 * Week = Monday..Sunday based on date_trunc('week', CURRENT_DATE) (Postgres uses Monday).
 */
export async function getTaskSummaryByUserId(userId) {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE status != 'done')::int AS open_total,
      COUNT(*) FILTER (WHERE status = 'todo')::int AS todo,
      COUNT(*) FILTER (WHERE status = 'doing')::int AS doing,
      COUNT(*) FILTER (WHERE status = 'done')::int AS done,

      COUNT(*) FILTER (
        WHERE status != 'done'
          AND due_date IS NOT NULL
          AND due_date < CURRENT_DATE
      )::int AS overdue,

      COUNT(*) FILTER (
        WHERE status != 'done'
          AND due_date = CURRENT_DATE
      )::int AS due_today,

      COUNT(*) FILTER (
        WHERE status != 'done'
          AND due_date >= date_trunc('week', CURRENT_DATE)::date
          AND due_date <= (date_trunc('week', CURRENT_DATE)::date + 6)
      )::int AS due_this_week
    FROM tasks
    WHERE user_id = $1;
    `,
    [userId]
  );

  return result.rows[0] || {
    open_total: 0,
    todo: 0,
    doing: 0,
    done: 0,
    overdue: 0,
    due_today: 0,
    due_this_week: 0,
  };
}