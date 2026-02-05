-- 010_ensure_task_attachments_original_filename.sql
-- Some existing databases use original_filename and/or enforce NOT NULL on it.
-- Ensure both original_name and original_filename exist, are backfilled, and stay NOT NULL.

ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS original_name TEXT;

-- Backfill both directions
UPDATE task_attachments
SET
  original_name = COALESCE(original_name, original_filename),
  original_filename = COALESCE(original_filename, original_name);

-- If still null (legacy/bad rows), set safe placeholder
UPDATE task_attachments
SET
  original_name = COALESCE(original_name, 'unknown'),
  original_filename = COALESCE(original_filename, 'unknown')
WHERE original_name IS NULL OR original_filename IS NULL;

-- Enforce NOT NULL
ALTER TABLE task_attachments ALTER COLUMN original_name SET NOT NULL;
ALTER TABLE task_attachments ALTER COLUMN original_filename SET NOT NULL;
