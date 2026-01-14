-- 002_calendar_blocks_and_task_fields.sql
-- Adds scheduling-related fields and a calendar_blocks table to support the AI scheduler.

-- TASKS: add a few optional scheduling fields (safe defaults for existing rows)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes INT NOT NULL DEFAULT 60 CHECK (estimated_minutes > 0),
  ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS splittable BOOLEAN NOT NULL DEFAULT true;

-- USER SETTINGS: store defaults so the assistant doesn't have to ask every time
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  buffer_minutes INT NOT NULL DEFAULT 10 CHECK (buffer_minutes BETWEEN 0 AND 120),
  study_window JSONB NOT NULL DEFAULT '{"start":"18:00","end":"22:00"}',
  meal_windows JSONB NOT NULL DEFAULT '[{"start":"12:00","end":"13:00"},{"start":"18:00","end":"19:00"}]',
  sleep_window JSONB NOT NULL DEFAULT '{"start":"00:00","end":"08:00"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CALENDAR BLOCKS: fixed lessons + AI-generated task blocks live here
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'lesson' | 'task' | 'meal' | 'commute' | ...
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'ai' | 'google'
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT calendar_blocks_time_valid CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_user_start ON calendar_blocks (user_id, start_at);

-- Auto-update updated_at on update (reuse existing trigger function if present)
DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_calendar_blocks_updated_at ON calendar_blocks;
CREATE TRIGGER trg_calendar_blocks_updated_at
BEFORE UPDATE ON calendar_blocks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
