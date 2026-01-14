import { listTasksByUserId } from "../repositories/tasks.repo.js";
import {
  createCalendarBlocksBulk,
  deleteCalendarBlocksByUserId,
  listCalendarBlocksByUserId,
} from "../repositories/calendarBlocks.repo.js";
import { getUserSettings, upsertUserSettings } from "../repositories/userSettings.repo.js";

/**
 * v1 Scheduler (capstone-friendly):
 * - Only schedules within a single daily study window (default 18:00–22:00, Asia/Seoul)
 * - Avoids existing fixed blocks (lessons, meetings, etc.)
 * - Greedy placement: earliest available slots first, respecting deadlines + priority
 *
 * Timezone note:
 * - For v1 we assume Asia/Seoul (UTC+9, no DST). Stored timestamps are timestamptz.
 */

const SEOUL_OFFSET_MINUTES = 9 * 60;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseYmd(ymd) {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return { y, m, d };
}

function addDaysYmd(ymd, days) {
  const { y, m, d } = parseYmd(ymd);
  const dateUtc = new Date(Date.UTC(y, m - 1, d));
  dateUtc.setUTCDate(dateUtc.getUTCDate() + days);
  const yy = dateUtc.getUTCFullYear();
  const mm = pad2(dateUtc.getUTCMonth() + 1);
  const dd = pad2(dateUtc.getUTCDate());
  return `${yy}-${mm}-${dd}`;
}

function ymdToSeoulIso(ymd, minutesFromMidnight) {
  const hh = Math.floor(minutesFromMidnight / 60);
  const mm = minutesFromMidnight % 60;
  return `${ymd}T${pad2(hh)}:${pad2(mm)}:00+09:00`;
}

function toSeoulParts(dateObj) {
  // Convert a real instant to Seoul "local parts" using a fixed +09:00 offset.
  const ms = dateObj.getTime() + SEOUL_OFFSET_MINUTES * 60_000;
  const d = new Date(ms);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    hh: d.getUTCHours(),
    mm: d.getUTCMinutes(),
  };
}

function toSeoulYmd(dateObj) {
  const p = toSeoulParts(dateObj);
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

function minutesFromParts({ hh, mm }) {
  return hh * 60 + mm;
}

function normalizeWindow(win) {
  // win: {start:"18:00", end:"22:00"}
  const [sh, sm] = win.start.split(":").map(Number);
  const [eh, em] = win.end.split(":").map(Number);
  return { startMin: sh * 60 + sm, endMin: eh * 60 + em };
}

function subtractInterval(free, busyStart, busyEnd) {
  // free: [{startMin,endMin}]
  const out = [];
  for (const seg of free) {
    if (busyEnd <= seg.startMin || busyStart >= seg.endMin) {
      out.push(seg);
      continue;
    }
    if (busyStart > seg.startMin) {
      out.push({ startMin: seg.startMin, endMin: Math.min(busyStart, seg.endMin) });
    }
    if (busyEnd < seg.endMin) {
      out.push({ startMin: Math.max(busyEnd, seg.startMin), endMin: seg.endMin });
    }
  }
  // normalize (remove tiny / invalid)
  return out.filter((s) => s.endMin - s.startMin > 0).sort((a, b) => a.startMin - b.startMin);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function sortTasksForScheduling(tasks) {
  // due_date null goes last; earlier due first; higher priority first
  return [...tasks].sort((a, b) => {
    const ad = a.due_date ? new Date(a.due_date) : null;
    const bd = b.due_date ? new Date(b.due_date) : null;
    if (ad && bd) {
      const diff = ad.getTime() - bd.getTime();
      if (diff !== 0) return diff;
    } else if (ad && !bd) return -1;
    else if (!ad && bd) return 1;

    // priority: 1..5 (5 is highest)
    const ap = Number(a.priority ?? 3);
    const bp = Number(b.priority ?? 3);
    return bp - ap;
  });
}

export async function ensureUserSettings(userId) {
  const existing = await getUserSettings(userId);
  if (existing) return existing;
  return await upsertUserSettings(userId, {}); // creates defaults
}

export async function scheduleWeekForUser(userId, { startYmd, days = 7 } = {}) {
  const settings = await ensureUserSettings(userId);

  // v1: only support Asia/Seoul; keep a single study window
  const study = normalizeWindow(settings.study_window ?? { start: "18:00", end: "22:00" });
  const buffer = clamp(Number(settings.buffer_minutes ?? 10), 0, 120);

  const todaySeoul = toSeoulYmd(new Date());
  const start = startYmd ?? todaySeoul;
  const end = addDaysYmd(start, days - 1);

  // Range in actual instants for querying DB:
  const rangeStartIso = ymdToSeoulIso(start, 0);
  const rangeEndIso = ymdToSeoulIso(end, 24 * 60 - 1);

  // Remove previous AI-generated TASK blocks in the window before rescheduling
  await deleteCalendarBlocksByUserId(userId, {
    from: rangeStartIso,
    to: rangeEndIso,
    source: "ai",
    type: "task",
  });

  const existingBlocks = await listCalendarBlocksByUserId(userId, { from: rangeStartIso, to: rangeEndIso });

  // Build busy intervals per day from fixed blocks (and also any manual task blocks)
  const busyByDay = new Map(); // ymd -> [{startMin,endMin}]
  for (const b of existingBlocks) {
    if (b.source === "ai" && b.type === "task") continue; // we deleted them, but just in case
    // treat all non-ai blocks as busy
    const s = toSeoulParts(new Date(b.start_at));
    const e = toSeoulParts(new Date(b.end_at));
    const ymd = `${s.y}-${pad2(s.m)}-${pad2(s.d)}`;

    // Only support same-day blocks for v1
    if (toSeoulYmd(new Date(b.start_at)) !== toSeoulYmd(new Date(b.end_at))) continue;

    const startMin = minutesFromParts(s);
    const endMin = minutesFromParts(e);

    if (!busyByDay.has(ymd)) busyByDay.set(ymd, []);
    busyByDay.get(ymd).push({ startMin, endMin });
  }

  // Free segments per day
  const freeByDay = new Map(); // ymd -> [{startMin,endMin}]
  for (let di = 0; di < days; di++) {
    const ymd = addDaysYmd(start, di);
    let free = [{ startMin: study.startMin, endMin: study.endMin }];
    const busy = busyByDay.get(ymd) ?? [];
    for (const b of busy) {
      free = subtractInterval(free, b.startMin, b.endMin);
    }
    freeByDay.set(ymd, free);
  }

  // Get open tasks and schedule those due soon first
  const allTasks = await listTasksByUserId(userId, {});
  const openTasks = allTasks.filter((t) => t.status !== "done");

  const tasks = sortTasksForScheduling(openTasks);

  const newBlocks = [];
  const unscheduled = [];

  const MIN_BLOCK = 25; // minutes

  for (const t of tasks) {
    const est = clamp(Number(t.estimated_minutes ?? 60), 1, 24 * 60);
    const splittable = t.splittable !== false; // default true
    const due = t.due_date ? String(t.due_date).slice(0, 10) : null;

    // Determine last allowed day for this task within our scheduling horizon
    let lastAllowed = end;
    if (due) {
      // If due is before start, it's already overdue -> schedule asap (still within window)
      if (due < start) lastAllowed = start;
      else if (due < end) lastAllowed = due;
    }

    let remaining = est;

    const placeOneChunk = (chunkMinutes) => {
      for (let di = 0; di < days; di++) {
        const ymd = addDaysYmd(start, di);
        if (ymd > lastAllowed) break;

        const free = freeByDay.get(ymd) ?? [];
        for (let si = 0; si < free.length; si++) {
          const seg = free[si];
          const segLen = seg.endMin - seg.startMin;
          if (segLen < chunkMinutes) continue;

          const startMin = seg.startMin;
          const endMin = startMin + chunkMinutes;

          // create block
          newBlocks.push({
            task_id: t.id,
            type: "task",
            title: t.title,
            start_at: ymdToSeoulIso(ymd, startMin),
            end_at: ymdToSeoulIso(ymd, endMin),
            is_fixed: false,
            source: "ai",
            meta: { task_id: t.id, scheduled_by: "v1_greedy" },
          });

          // consume segment
          const newStart = endMin + buffer;
          if (newStart >= seg.endMin) {
            free.splice(si, 1);
          } else {
            seg.startMin = newStart;
          }
          freeByDay.set(ymd, free);
          return true;
        }
      }
      return false;
    };

    if (!splittable) {
      // must be scheduled as one contiguous block
      const ok = placeOneChunk(Math.max(remaining, MIN_BLOCK));
      if (!ok) {
        unscheduled.push({ task_id: t.id, title: t.title, remaining_minutes: remaining, reason: "No free contiguous slot" });
      } else {
        remaining = 0;
      }
      continue;
    }

    while (remaining > 0) {
      const chunk = Math.max(MIN_BLOCK, Math.min(60, remaining));
      const ok = placeOneChunk(chunk);
      if (!ok) break;
      remaining -= chunk;
    }

    if (remaining > 0) {
      unscheduled.push({ task_id: t.id, title: t.title, remaining_minutes: remaining, reason: "Not enough free time before deadline" });
    }
  }

  const inserted = await createCalendarBlocksBulk(userId, newBlocks);

  return {
    window: { start, end, timezone: settings.timezone },
    scheduled_blocks: inserted,
    unscheduled,
  };
}
