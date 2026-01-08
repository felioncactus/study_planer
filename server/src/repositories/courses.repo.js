import { pool } from "../config/db.js";

export async function listCoursesByUserId(userId) {
  const result = await pool.query(
    `SELECT id, user_id, name, color, created_at
     FROM courses
     WHERE user_id = $1
     ORDER BY created_at DESC;`,
    [userId]
  );
  return result.rows;
}

export async function createCourse({ userId, name, color }) {
  const result = await pool.query(
    `INSERT INTO courses (user_id, name, color)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, name, color, created_at;`,
    [userId, name, color ?? null]
  );
  return result.rows[0];
}

export async function updateCourse({ courseId, userId, name, color }) {
  const result = await pool.query(
    `UPDATE courses
     SET name = $3, color = $4
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, name, color, created_at;`,
    [courseId, userId, name, color ?? null]
  );
  return result.rows[0] || null;
}

export async function deleteCourse({ courseId, userId }) {
  const result = await pool.query(
    `DELETE FROM courses
     WHERE id = $1 AND user_id = $2
     RETURNING id;`,
    [courseId, userId]
  );
  return result.rows[0] || null;
}
