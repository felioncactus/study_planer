-- 009_fix_task_attachments_columns.sql
-- Ensures task_attachments has the expected columns even if the table existed before 008 ran.
-- This fixes: column "original_name" of relation "task_attachments" does not exist

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  stored_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE task_attachments
  ADD COLUMN IF NOT EXISTS original_name TEXT;

ALTER TABLE task_attachments
  ADD COLUMN IF NOT EXISTS stored_name TEXT;

ALTER TABLE task_attachments
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

ALTER TABLE task_attachments
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT;

ALTER TABLE task_attachments
  ADD COLUMN IF NOT EXISTS stored_path TEXT;

ALTER TABLE task_attachments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Backfill defaults for existing rows (if any)
UPDATE task_attachments SET original_name = COALESCE(original_name, '') WHERE original_name IS NULL;
UPDATE task_attachments SET stored_name   = COALESCE(stored_name, '')   WHERE stored_name IS NULL;
UPDATE task_attachments SET size_bytes    = COALESCE(size_bytes, 0)     WHERE size_bytes IS NULL;
UPDATE task_attachments SET stored_path   = COALESCE(stored_path, '')   WHERE stored_path IS NULL;
UPDATE task_attachments SET created_at    = COALESCE(created_at, NOW()) WHERE created_at IS NULL;

-- Enforce expected defaults / constraints (safe after backfill)
ALTER TABLE task_attachments
  ALTER COLUMN size_bytes SET DEFAULT 0;

ALTER TABLE task_attachments
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE task_attachments
  ALTER COLUMN original_name SET NOT NULL;

ALTER TABLE task_attachments
  ALTER COLUMN stored_name SET NOT NULL;

ALTER TABLE task_attachments
  ALTER COLUMN size_bytes SET NOT NULL;

ALTER TABLE task_attachments
  ALTER COLUMN stored_path SET NOT NULL;

ALTER TABLE task_attachments
  ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON task_attachments(user_id);
