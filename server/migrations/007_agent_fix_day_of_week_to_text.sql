-- 007_fix_day_of_week_to_text.sql
-- Fixes older schemas where courses.day_of_week was numeric (SMALLINT/INT) and/or had numeric CHECK constraints.
-- Converts the column to TEXT so the client can send values like 'Mon', 'Tue', etc.

DO $$
DECLARE
  dtype TEXT;
  con RECORD;
BEGIN
  SELECT data_type INTO dtype
  FROM information_schema.columns
  WHERE table_name='courses' AND column_name='day_of_week'
  LIMIT 1;

  IF dtype IS NULL THEN
    -- Column doesn't exist; nothing to do (006 adds it as TEXT).
    RETURN;
  END IF;

  -- Drop any CHECK constraints referencing day_of_week (common in numeric schemas: day_of_week >= 0 AND day_of_week <= 6)
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'courses'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%day_of_week%'
  LOOP
    EXECUTE format('ALTER TABLE courses DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;

  IF dtype IN ('smallint', 'integer', 'bigint') THEN
    ALTER TABLE courses
      ALTER COLUMN day_of_week TYPE TEXT
      USING (
        CASE day_of_week::int
          WHEN 0 THEN 'Sun'
          WHEN 1 THEN 'Mon'
          WHEN 2 THEN 'Tue'
          WHEN 3 THEN 'Wed'
          WHEN 4 THEN 'Thu'
          WHEN 5 THEN 'Fri'
          WHEN 6 THEN 'Sat'
          ELSE day_of_week::text
        END
      );
  END IF;

  -- Add a sane CHECK constraint for the new TEXT representation (optional, but keeps data clean).
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'courses'
      AND c.contype = 'c'
      AND c.conname = 'courses_day_of_week_text_chk'
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_day_of_week_text_chk
      CHECK (day_of_week IS NULL OR day_of_week IN ('Sun','Mon','Tue','Wed','Thu','Fri','Sat'));
  END IF;
END $$;
