-- 012_course_date_range.sql
-- Adds optional course begin/end dates so recurring meetings only appear within the active course window.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS begins_on DATE NULL,
  ADD COLUMN IF NOT EXISTS ends_on DATE NULL;

-- Keep ranges sane when both values are present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_begin_end_range_chk'
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_begin_end_range_chk
      CHECK (begins_on IS NULL OR ends_on IS NULL OR begins_on <= ends_on);
  END IF;
END $$;
