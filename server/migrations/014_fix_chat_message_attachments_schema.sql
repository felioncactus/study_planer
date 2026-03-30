-- Normalize chat_message_attachments so the chat repository and UI can rely on the newer column names.
-- This is safe to run on databases that already have the correct shape.

CREATE TABLE IF NOT EXISTS chat_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_url TEXT NULL,
  storage_path TEXT NULL,
  original_filename TEXT NULL,
  mime_type TEXT NULL,
  size_bytes BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_message_attachments
  ADD COLUMN IF NOT EXISTS file_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS storage_path TEXT NULL,
  ADD COLUMN IF NOT EXISTS original_filename TEXT NULL,
  ADD COLUMN IF NOT EXISTS mime_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_message_attachments'
      AND column_name = 'stored_path'
  ) THEN
    EXECUTE '
      UPDATE chat_message_attachments
      SET storage_path = COALESCE(storage_path, stored_path)
      WHERE storage_path IS NULL
        AND stored_path IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_message_attachments'
      AND column_name = 'original_name'
  ) THEN
    EXECUTE '
      UPDATE chat_message_attachments
      SET original_filename = COALESCE(original_filename, original_name)
      WHERE original_filename IS NULL
        AND original_name IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_message_attachments'
      AND column_name = 'stored_name'
  ) THEN
    EXECUTE '
      UPDATE chat_message_attachments
      SET original_filename = COALESCE(original_filename, stored_name)
      WHERE original_filename IS NULL
        AND stored_name IS NOT NULL
    ';
  END IF;

  UPDATE chat_message_attachments
  SET file_url = '/uploads/chat/' || regexp_replace(storage_path, '^.*[\\/]', '')
  WHERE (file_url IS NULL OR file_url = '')
    AND storage_path IS NOT NULL
    AND storage_path <> '';

  UPDATE chat_message_attachments
  SET created_at = NOW()
  WHERE created_at IS NULL;
END $$;

ALTER TABLE chat_message_attachments
  ALTER COLUMN created_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_chat_message_attachments_message_id
  ON chat_message_attachments(message_id);
