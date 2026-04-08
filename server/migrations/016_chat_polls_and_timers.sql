-- Chat polls + timers for group conversations

CREATE TABLE IF NOT EXISTS chat_poll_votes (
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_poll_votes_message_id
  ON chat_poll_votes(message_id);

CREATE TABLE IF NOT EXISTS chat_timer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL UNIQUE REFERENCES chat_messages(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_timer_events_chat_id
  ON chat_timer_events(chat_id);

CREATE INDEX IF NOT EXISTS idx_chat_timer_events_ends_at
  ON chat_timer_events(ends_at);
