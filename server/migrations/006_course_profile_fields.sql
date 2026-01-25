-- 006_course_profile_fields.sql
-- Adds richer course profile fields (description, schedule, exams) and image/banner URLs.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS description TEXT NULL,
  ADD COLUMN IF NOT EXISTS day_of_week TEXT NULL, -- e.g. Mon, Tue ...
  ADD COLUMN IF NOT EXISTS start_time TIME NULL,
  ADD COLUMN IF NOT EXISTS end_time TIME NULL,
  ADD COLUMN IF NOT EXISTS midterm_date DATE NULL,
  ADD COLUMN IF NOT EXISTS final_date DATE NULL,
  ADD COLUMN IF NOT EXISTS image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS banner_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- backfill updated_at for existing rows (safe)
UPDATE courses SET updated_at = COALESCE(updated_at, created_at, NOW());

-- Auto-update updated_at on update (re-use existing function set_updated_at())
DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
