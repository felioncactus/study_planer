-- 013_chat_conversations.sql
-- Introduce richer conversations with support for direct chats, self-chat, groups, attachments, and bot messages.
-- This migration is intentionally resilient to partially pre-created tables/constraints from older local setups.

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE chat_conversations
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN title DROP NOT NULL,
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'chat_conversations'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_conversations_type_check'
  ) THEN
    ALTER TABLE chat_conversations
      ADD CONSTRAINT chat_conversations_type_check
      CHECK (type IN ('direct', 'self', 'group'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_conversations_title_check'
  ) THEN
    ALTER TABLE chat_conversations
      ADD CONSTRAINT chat_conversations_title_check
      CHECK (
        type <> 'group'
        OR NULLIF(BTRIM(title), '') IS NOT NULL
      );
  END IF;
END $$;

UPDATE chat_conversations
SET title = 'Group chat'
WHERE type = 'group'
  AND NULLIF(BTRIM(title), '') IS NULL;

DROP TRIGGER IF EXISTS trg_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER trg_chat_conversations_updated_at
BEFORE UPDATE ON chat_conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

CREATE TABLE IF NOT EXISTS chat_direct_links (
  chat_id UUID NOT NULL UNIQUE REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_low_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (user_low_id, user_high_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_direct_links_chat_id ON chat_direct_links(chat_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  sender_kind TEXT NOT NULL DEFAULT 'user' CHECK (sender_kind IN ('user', 'bot')),
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id_created_at ON chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);

CREATE TABLE IF NOT EXISTS chat_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NULL,
  size_bytes BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_message_attachments_message_id ON chat_message_attachments(message_id);

DO $$
DECLARE
  f RECORD;
  u RECORD;
  created_chat_id UUID;
BEGIN
  -- Seed direct chats for accepted friend pairs.
  FOR f IN
    SELECT user_low_id, user_high_id, requested_by, created_at, updated_at
    FROM friendships
    WHERE status = 'accepted'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM chat_direct_links dl
      WHERE dl.user_low_id = f.user_low_id AND dl.user_high_id = f.user_high_id
    ) THEN
      INSERT INTO chat_conversations (type, title, created_by, created_at, updated_at)
      VALUES ('direct', NULL, f.requested_by, f.created_at, COALESCE(f.updated_at, f.created_at))
      RETURNING id INTO created_chat_id;

      INSERT INTO chat_direct_links (chat_id, user_low_id, user_high_id)
      VALUES (created_chat_id, f.user_low_id, f.user_high_id);

      INSERT INTO chat_participants (chat_id, user_id, joined_at)
      VALUES (created_chat_id, f.user_low_id, f.created_at)
      ON CONFLICT (chat_id, user_id) DO NOTHING;

      INSERT INTO chat_participants (chat_id, user_id, joined_at)
      VALUES (created_chat_id, f.user_high_id, f.created_at)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Every user gets a self chat.
  FOR u IN SELECT id, created_at FROM users LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM chat_direct_links dl
      WHERE dl.user_low_id = u.id AND dl.user_high_id = u.id
    ) THEN
      INSERT INTO chat_conversations (type, title, created_by, created_at, updated_at)
      VALUES ('self', 'Notes to self', u.id, u.created_at, NOW())
      RETURNING id INTO created_chat_id;

      INSERT INTO chat_direct_links (chat_id, user_low_id, user_high_id)
      VALUES (created_chat_id, u.id, u.id);

      INSERT INTO chat_participants (chat_id, user_id, joined_at)
      VALUES (created_chat_id, u.id, u.created_at)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Migrate legacy 1:1 messages into direct chats exactly once.
INSERT INTO chat_messages (id, chat_id, sender_id, sender_kind, body, created_at, metadata)
SELECT
  m.id,
  dl.chat_id,
  m.sender_id,
  'user',
  m.body,
  m.created_at,
  jsonb_build_object(
    'migrated_from_legacy_messages', true,
    'legacy_read_at', m.read_at,
    'legacy_read_by', m.read_by
  )
FROM messages m
JOIN chat_direct_links dl
  ON dl.user_low_id = m.user_low_id AND dl.user_high_id = m.user_high_id
LEFT JOIN chat_messages cm
  ON cm.id = m.id
WHERE cm.id IS NULL;
