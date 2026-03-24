
import { pool } from "../config/db.js";

export async function getProductivityStats(userId) {
  const [taskSummaryRes, completionTrendRes, loadRes, courseRes, blockMixRes] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'todo')::int AS todo,
        COUNT(*) FILTER (WHERE status = 'doing')::int AS doing,
        COUNT(*) FILTER (WHERE status = 'done')::int AS done,
        COUNT(*) FILTER (WHERE status != 'done' AND due_date < CURRENT_DATE)::int AS overdue,
        COUNT(*) FILTER (WHERE status != 'done' AND due_date = CURRENT_DATE)::int AS due_today,
        COUNT(*) FILTER (
          WHERE status != 'done'
            AND due_date >= CURRENT_DATE
            AND due_date <= CURRENT_DATE + 6
        )::int AS due_next_7_days,
        COALESCE(AVG(NULLIF(estimated_minutes, 0)) FILTER (WHERE status != 'done'), 0)::int AS avg_open_task_minutes
      FROM tasks
      WHERE user_id = $1;
      `,
      [userId]
    ),
    pool.query(
      `
      SELECT
        day::date AS day,
        COUNT(*) FILTER (WHERE status = 'done')::int AS completed,
        COUNT(*) FILTER (WHERE status != 'done')::int AS created_open
      FROM (
        SELECT created_at::date AS day, status
        FROM tasks
        WHERE user_id = $1
          AND created_at >= CURRENT_DATE - INTERVAL '13 days'
        UNION ALL
        SELECT updated_at::date AS day, status
        FROM tasks
        WHERE user_id = $1
          AND status = 'done'
          AND updated_at >= CURRENT_DATE - INTERVAL '13 days'
      ) t
      GROUP BY day
      ORDER BY day ASC;
      `,
      [userId]
    ),
    pool.query(
      `
      SELECT
        day::date AS day,
        COALESCE(SUM(task_minutes), 0)::int AS task_minutes,
        COALESCE(SUM(activity_minutes), 0)::int AS activity_minutes
      FROM (
        SELECT
          generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
      ) d
      LEFT JOIN LATERAL (
        SELECT
          SUM(
            CASE WHEN type = 'task'
              THEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (LEAST(end_at, d.day + INTERVAL '1 day') - GREATEST(start_at, d.day))) / 60.0))
              ELSE 0
            END
          )::int AS task_minutes,
          SUM(
            CASE WHEN type = 'activity'
              THEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (LEAST(end_at, d.day + INTERVAL '1 day') - GREATEST(start_at, d.day))) / 60.0))
              ELSE 0
            END
          )::int AS activity_minutes
        FROM calendar_blocks
        WHERE user_id = $1
          AND start_at < d.day + INTERVAL '1 day'
          AND end_at > d.day
      ) x ON TRUE
      GROUP BY day
      ORDER BY day ASC;
      `,
      [userId]
    ),
    pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.color,
        COUNT(t.id)::int AS total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS done_tasks,
        COUNT(t.id) FILTER (WHERE t.status != 'done')::int AS open_tasks
      FROM courses c
      LEFT JOIN tasks t
        ON t.course_id = c.id
       AND t.user_id = c.user_id
      WHERE c.user_id = $1
      GROUP BY c.id, c.name, c.color
      ORDER BY open_tasks DESC, total_tasks DESC, c.name ASC
      LIMIT 6;
      `,
      [userId]
    ),
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE type = 'task')::int AS task_blocks,
        COUNT(*) FILTER (WHERE type = 'activity')::int AS activity_blocks,
        COALESCE(SUM(
          CASE WHEN type = 'task' THEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (end_at - start_at)) / 60.0)) ELSE 0 END
        ), 0)::int AS task_block_minutes,
        COALESCE(SUM(
          CASE WHEN type = 'activity' THEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (end_at - start_at)) / 60.0)) ELSE 0 END
        ), 0)::int AS activity_block_minutes
      FROM calendar_blocks
      WHERE user_id = $1
        AND start_at >= CURRENT_DATE - INTERVAL '30 days';
      `,
      [userId]
    ),
  ]);

  return {
    taskSummary: taskSummaryRes.rows[0] || {},
    completionTrend: completionTrendRes.rows || [],
    calendarLoad: loadRes.rows || [],
    topCourses: courseRes.rows || [],
    blockMix: blockMixRes.rows[0] || {},
  };
}
