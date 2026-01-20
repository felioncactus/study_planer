-- 005_message_reads.sql
-- Add read tracking to 1:1 messages so we can show "unread" counts in the UI.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS read_by UUID NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_unread_for_user
  ON messages (user_low_id, user_high_id, created_at)
  WHERE read_at IS NULL;
