
-- Ensure chat_message_attachments.message_id references the current chat_messages table.
-- Older local databases may still point to chat_messages_v2.

DO $$
DECLARE
  fk_name TEXT;
  target_table TEXT;
BEGIN
  SELECT tc.constraint_name, ccu.table_name
  INTO fk_name, target_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'chat_message_attachments'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'message_id'
  LIMIT 1;

  IF fk_name IS NOT NULL AND target_table IS DISTINCT FROM 'chat_messages' THEN
    EXECUTE format('ALTER TABLE chat_message_attachments DROP CONSTRAINT IF EXISTS %I', fk_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'chat_message_attachments'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'message_id'
      AND ccu.table_name = 'chat_messages'
  ) THEN
    ALTER TABLE chat_message_attachments
      ADD CONSTRAINT chat_message_attachments_message_id_fkey
      FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;
  END IF;
END $$;
