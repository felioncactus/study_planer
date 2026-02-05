-- 009_ensure_task_attachments_columns.sql
-- Ensures task_attachments schema is compatible across earlier variants
-- (some DBs used stored_filename instead of stored_name, etc.)

DO $$
BEGIN
  -- Create base table if it doesn't exist (compatible superset)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_attachments'
  ) THEN
    CREATE TABLE task_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      mime_type TEXT NULL,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      stored_path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- If the older schema used stored_filename but not stored_name, rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='task_attachments' AND column_name='stored_filename'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='task_attachments' AND column_name='stored_name'
  ) THEN
    EXECUTE 'ALTER TABLE task_attachments RENAME COLUMN stored_filename TO stored_name';
  END IF;
END $$;

-- Add missing columns (superset)
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS stored_name TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS stored_filename TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS size_bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS stored_path TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- If an even older schema used original_filename, copy/rename
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='task_attachments' AND column_name='original_filename'
  ) THEN
    EXECUTE 'UPDATE task_attachments SET original_name = COALESCE(original_name, original_filename)';
  END IF;
END $$;

-- If an older schema used "path", copy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='task_attachments' AND column_name='path'
  ) THEN
    EXECUTE 'UPDATE task_attachments SET stored_path = COALESCE(stored_path, path)';
  END IF;
END $$;

-- Backfill the two stored name columns in both directions
UPDATE task_attachments
SET
  stored_name = COALESCE(stored_name, stored_filename),
  stored_filename = COALESCE(stored_filename, stored_name),
  original_name = COALESCE(original_name, 'unknown'),
  stored_path = COALESCE(stored_path, '');

-- Enforce NOT NULL after backfill
ALTER TABLE task_attachments ALTER COLUMN original_name SET NOT NULL;
ALTER TABLE task_attachments ALTER COLUMN stored_name SET NOT NULL;
ALTER TABLE task_attachments ALTER COLUMN stored_filename SET NOT NULL;
ALTER TABLE task_attachments ALTER COLUMN stored_path SET NOT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON task_attachments(user_id);
