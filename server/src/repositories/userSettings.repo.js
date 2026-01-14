import { pool } from "../config/db.js";

export async function getUserSettings(userId) {
  const result = await pool.query(
    `
    SELECT user_id, timezone, buffer_minutes, study_window, meal_windows, sleep_window, created_at, updated_at
    FROM user_settings
    WHERE user_id = $1;
    `,
    [userId]
  );
  return result.rows[0] || null;
}

export async function upsertUserSettings(userId, patch) {
  const {
    timezone,
    buffer_minutes,
    study_window,
    meal_windows,
    sleep_window,
  } = patch;

  const result = await pool.query(
    `
    INSERT INTO user_settings (user_id, timezone, buffer_minutes, study_window, meal_windows, sleep_window)
    VALUES ($1, COALESCE($2, 'Asia/Seoul'), COALESCE($3, 10), COALESCE($4, '{"start":"18:00","end":"22:00"}'::jsonb), COALESCE($5, '[{"start":"12:00","end":"13:00"},{"start":"18:00","end":"19:00"}]'::jsonb), COALESCE($6, '{"start":"00:00","end":"08:00"}'::jsonb))
    ON CONFLICT (user_id) DO UPDATE SET
      timezone = COALESCE(EXCLUDED.timezone, user_settings.timezone),
      buffer_minutes = COALESCE(EXCLUDED.buffer_minutes, user_settings.buffer_minutes),
      study_window = COALESCE(EXCLUDED.study_window, user_settings.study_window),
      meal_windows = COALESCE(EXCLUDED.meal_windows, user_settings.meal_windows),
      sleep_window = COALESCE(EXCLUDED.sleep_window, user_settings.sleep_window)
    RETURNING user_id, timezone, buffer_minutes, study_window, meal_windows, sleep_window, created_at, updated_at;
    `,
    [userId, timezone ?? null, buffer_minutes ?? null, study_window ?? null, meal_windows ?? null, sleep_window ?? null]
  );

  return result.rows[0];
}
