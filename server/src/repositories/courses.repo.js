import { pool } from "../config/db.js";

const COURSE_SELECT = `id, user_id, name, color, description, day_of_week, start_time, end_time, midterm_date, final_date, image_url, banner_url, created_at, updated_at`;

export async function listCoursesByUserId(userId) {
  const result = await pool.query(
    `SELECT ${COURSE_SELECT}
     FROM courses
     WHERE user_id = $1
     ORDER BY created_at DESC;`,
    [userId]
  );
  return result.rows;
}

export async function getCourseByIdForUser({ courseId, userId }) {
  const result = await pool.query(
    `SELECT ${COURSE_SELECT}
     FROM courses
     WHERE id = $1 AND user_id = $2
     LIMIT 1;`,
    [courseId, userId]
  );
  return result.rows[0] || null;
}

export async function createCourse({
  userId,
  name,
  color,
  description,
  dayOfWeek,
  startTime,
  endTime,
  midtermDate,
  finalDate,
  imageUrl,
  bannerUrl,
}) {
  const result = await pool.query(
    `INSERT INTO courses (user_id, name, color, description, day_of_week, start_time, end_time, midterm_date, final_date, image_url, banner_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${COURSE_SELECT};`,
    [
      userId,
      name,
      color ?? null,
      description ?? null,
      dayOfWeek ?? null,
      startTime ?? null,
      endTime ?? null,
      midtermDate ?? null,
      finalDate ?? null,
      imageUrl ?? null,
      bannerUrl ?? null,
    ]
  );
  return result.rows[0];
}

export async function updateCourse({
  courseId,
  userId,
  name,
  color,
  description,
  dayOfWeek,
  startTime,
  endTime,
  midtermDate,
  finalDate,
  imageUrl,
  bannerUrl,
}) {
  const result = await pool.query(
    `UPDATE courses
     SET
       name = COALESCE($3, name),
       color = COALESCE($4, color),
       description = COALESCE($5, description),
       day_of_week = COALESCE($6, day_of_week),
       start_time = COALESCE($7, start_time),
       end_time = COALESCE($8, end_time),
       midterm_date = COALESCE($9, midterm_date),
       final_date = COALESCE($10, final_date),
       image_url = COALESCE($11, image_url),
       banner_url = COALESCE($12, banner_url)
     WHERE id = $1 AND user_id = $2
     RETURNING ${COURSE_SELECT};`,
    [
      courseId,
      userId,
      name ?? null,
      color ?? null,
      description ?? null,
      dayOfWeek ?? null,
      startTime ?? null,
      endTime ?? null,
      midtermDate ?? null,
      finalDate ?? null,
      imageUrl ?? null,
      bannerUrl ?? null,
    ]
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
