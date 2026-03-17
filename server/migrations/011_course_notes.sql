-- 011_course_notes.sql
-- Adds AI-assisted course notes with rich-text HTML content.

CREATE TABLE IF NOT EXISTS course_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_notes_user_id ON course_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_course_id ON course_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_course_updated_at ON course_notes(course_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_course_notes_updated_at ON course_notes;
CREATE TRIGGER trg_course_notes_updated_at
BEFORE UPDATE ON course_notes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
