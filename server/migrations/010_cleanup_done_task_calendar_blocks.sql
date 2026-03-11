-- 010_cleanup_done_task_calendar_blocks.sql
-- Remove stale planned/scheduled calendar blocks for tasks already marked as done.
-- This is data cleanup only; runtime cleanup is handled in the task service.

DELETE FROM calendar_blocks cb
USING tasks t
WHERE cb.task_id = t.id
  AND cb.type = 'task'
  AND t.status = 'done';
