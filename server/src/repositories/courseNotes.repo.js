import { pool } from "../config/db.js";

const NOTE_SELECT = `
  n.id,
  n.user_id,
  n.course_id,
  n.title,
  n.content_html,
  n.created_at,
  n.updated_at,
  c.name AS course_name
`;

export async function listCourseNotesForCourse({ userId, courseId }) {
  const result = await pool.query(
    `SELECT ${NOTE_SELECT}
     FROM course_notes n
     JOIN courses c ON c.id = n.course_id
     WHERE n.user_id = $1 AND n.course_id = $2
     ORDER BY n.updated_at DESC, n.created_at DESC;`,
    [userId, courseId]
  );
  return result.rows;
}

export async function getCourseNoteByIdForUser({ userId, noteId }) {
  const result = await pool.query(
    `SELECT ${NOTE_SELECT}
     FROM course_notes n
     JOIN courses c ON c.id = n.course_id
     WHERE n.user_id = $1 AND n.id = $2
     LIMIT 1;`,
    [userId, noteId]
  );
  return result.rows[0] || null;
}

export async function createCourseNote({ userId, courseId, title, contentHtml }) {
  const inserted = await pool.query(
    `INSERT INTO course_notes (user_id, course_id, title, content_html)
     VALUES ($1, $2, $3, $4)
     RETURNING id;`,
    [userId, courseId, title, contentHtml ?? ""]
  );
  return getCourseNoteByIdForUser({ userId, noteId: inserted.rows[0].id });
}

export async function updateCourseNote({ userId, noteId, title, contentHtml }) {
  const result = await pool.query(
    `UPDATE course_notes
     SET
       title = COALESCE($3, title),
       content_html = COALESCE($4, content_html),
       updated_at = NOW()
     WHERE user_id = $1 AND id = $2
     RETURNING id;`,
    [userId, noteId, title ?? null, contentHtml ?? null]
  );
  if (!result.rows[0]) return null;
  return getCourseNoteByIdForUser({ userId, noteId: result.rows[0].id });
}

export async function deleteCourseNote({ userId, noteId }) {
  const result = await pool.query(
    `DELETE FROM course_notes
     WHERE user_id = $1 AND id = $2
     RETURNING id;`,
    [userId, noteId]
  );
  return result.rows[0] || null;
}
