-- 004_friends_and_messages.sql

-- FRIENDSHIPS
-- Store each user pair once using (user_low_id, user_high_id).
-- requested_by: who initiated the request.
-- blocked_by: who blocked (only meaningful when status='blocked').

CREATE TABLE IF NOT EXISTS friendships (
  user_low_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_by   UUID NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_low_id, user_high_id),
  CHECK (user_low_id <> user_high_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_low ON friendships(user_low_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_high ON friendships(user_high_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

DROP TRIGGER IF EXISTS trg_friendships_updated_at ON friendships;
CREATE TRIGGER trg_friendships_updated_at
BEFORE UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- MESSAGES (1:1)
-- Chat is scoped to the same (user_low_id, user_high_id) pair.

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_low_id <> user_high_id),
  CHECK (sender_id IN (user_low_id, user_high_id))
);

CREATE INDEX IF NOT EXISTS idx_messages_pair_created_at ON messages(user_low_id, user_high_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
