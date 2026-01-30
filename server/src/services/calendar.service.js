import { z } from "zod";
import { listTasksByUserId } from "../repositories/tasks.repo.js";
import { listCoursesByUserId } from "../repositories/courses.repo.js";
import { listCalendarBlocksByUserId } from "../repositories/calendarBlocks.repo.js";

const QuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "start must be YYYY-MM-DD"),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "end must be YYYY-MM-DD"),
});

const SEOUL_TZ_OFFSET = "+09:00";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymdToIso(ymd, hh = 0, mm = 0) {
  return `${ymd}T${pad2(hh)}:${pad2(mm)}:00${SEOUL_TZ_OFFSET}`;
}

function normalizeDow(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  const key = s.slice(0, 3);
  const map = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
  return map[key] ?? null;
}

function ymdToDateUtc(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(dateUtc, days) {
  const d = new Date(dateUtc);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dateUtcToYmd(dateUtc) {
  const y = dateUtc.getUTCFullYear();
  const m = pad2(dateUtc.getUTCMonth() + 1);
  const d = pad2(dateUtc.getUTCDate());
  return `${y}-${m}-${d}`;
}

function timeToHm(timeLike) {
  if (!timeLike) return null;
  const s = String(timeLike); // "HH:MM:SS" or "HH:MM"
  const parts = s.split(":").map((x) => Number(x));
  return { hh: parts[0] ?? 0, mm: parts[1] ?? 0 };
}

/**
 * Unified calendar events for dashboard.
 * - Tasks show on due_date (all-day)
 * - Course meetings expand weekly based on day_of_week + start/end_time
 * - Midterm/final dates show as all-day events
 * - Calendar blocks (AI/manual) show as timed events
 */
export async function listCalendarEventsForUser(userId, query) {
  const { start, end } = QuerySchema.parse(query);

  // 1) Tasks (date-only)
  const tasks = await listTasksByUserId(userId, { from: start, to: end });

  // 2) Courses (recurring meetings + exams)
  const courses = await listCoursesByUserId(userId);

  // 3) Calendar blocks (timestamptz window)
  const blocks = await listCalendarBlocksByUserId(userId, {
    from: ymdToIso(start, 0, 0),
    to: ymdToIso(end, 23, 59),
  });

  const events = [];

  for (const t of tasks) {
    if (!t.due_date) continue;
    events.push({
      id: `task:${t.id}`,
      type: "task",
      title: t.title,
      start: t.due_date, // YYYY-MM-DD (all day)
      end: t.due_date,
      allDay: true,
      meta: {
        taskId: t.id,
        courseId: t.course_id ?? null,
        status: t.status,
        priority: t.priority,
      },
    });
  }

  // Exams as all-day events
  for (const c of courses) {
    if (c.midterm_date) {
      events.push({
        id: `exam:midterm:${c.id}:${c.midterm_date}`,
        type: "exam",
        title: `${c.name} • Midterm`,
        start: c.midterm_date,
        end: c.midterm_date,
        allDay: true,
        meta: { courseId: c.id, kind: "midterm", color: c.color ?? null },
      });
    }
    if (c.final_date) {
      events.push({
        id: `exam:final:${c.id}:${c.final_date}`,
        type: "exam",
        title: `${c.name} • Final`,
        start: c.final_date,
        end: c.final_date,
        allDay: true,
        meta: { courseId: c.id, kind: "final", color: c.color ?? null },
      });
    }
  }

  // Expand weekly meetings inside [start, end]
  const startUtc = ymdToDateUtc(start);
  const endUtc = ymdToDateUtc(end);

  for (const c of courses) {
    const dow = normalizeDow(c.day_of_week);
    if (dow === null) continue;

    const st = timeToHm(c.start_time);
    const et = timeToHm(c.end_time);
    if (!st || !et) continue;

    // iterate each day in window (date-only)
    for (let d = new Date(startUtc); d <= endUtc; d = addDays(d, 1)) {
      // JS getUTCDay matches 0=Sun..6=Sat
      if (d.getUTCDay() !== dow) continue;

      const ymd = dateUtcToYmd(d);
      const startIso = ymdToIso(ymd, st.hh, st.mm);
      const endIso = ymdToIso(ymd, et.hh, et.mm);

      events.push({
        id: `course:${c.id}:${ymd}`,
        type: "course",
        title: c.name,
        start: startIso,
        end: endIso,
        allDay: false,
        meta: { courseId: c.id, color: c.color ?? null },
      });
    }
  }

  for (const b of blocks) {
    events.push({
      id: `block:${b.id}`,
      type: "block",
      title: b.title,
      start: b.start_at,
      end: b.end_at,
      allDay: false,
      meta: {
        blockId: b.id,
        taskId: b.task_id ?? null,
        blockType: b.type,
        isFixed: b.is_fixed,
        source: b.source,
      },
    });
  }

  // Sort: all-day first by date, then timed by start
  events.sort((a, b) => {
    const aKey = `${a.allDay ? "0" : "1"}:${a.start}`;
    const bKey = `${b.allDay ? "0" : "1"}:${b.start}`;
    return aKey.localeCompare(bKey);
  });

  return { start, end, events };
}
