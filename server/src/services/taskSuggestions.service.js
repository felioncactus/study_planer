import { z } from "zod";
import { listCalendarBlocksByUserId } from "../repositories/calendarBlocks.repo.js";
import { listCoursesByUserId } from "../repositories/courses.repo.js";
import { getUserSettings } from "../repositories/userSettings.repo.js";

const SEOUL_OFFSET_MINUTES = 9 * 60;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymdToSeoulIso(ymd, hh, mm) {
  return `${ymd}T${pad2(hh)}:${pad2(mm)}:00+09:00`;
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

function toSeoulParts(dateObj) {
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

function parseHm(s) {
  if (!s) return { hh: 0, mm: 0 };
  const [hh, mm] = String(s).split(":").map((x) => Number(x));
  return { hh: Number.isFinite(hh) ? hh : 0, mm: Number.isFinite(mm) ? mm : 0 };
}


function normalizeDow(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  const key = s.slice(0, 3);
  const map = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
  return map[key] ?? null;
}

function timeToHm(timeLike) {
  if (!timeLike) return null;
  const s = String(timeLike); // "HH:MM:SS" or "HH:MM"
  const parts = s.split(":").map((x) => Number(x));
  const hh = parts[0];
  const mm = parts[1];
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return { hh, mm };
}


function normalizeWindow(win, fallbackStart = "18:00", fallbackEnd = "22:00") {
  const start = parseHm(win?.start ?? fallbackStart);
  const end = parseHm(win?.end ?? fallbackEnd);
  return {
    startMin: minutesFromParts(start),
    endMin: minutesFromParts(end),
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    const last = out[out.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

function subtractIntervals(windowInterval, busyIntervals) {
  const [wS, wE] = windowInterval;
  const busy = mergeIntervals(busyIntervals.map(([s, e]) => [clamp(s, wS, wE), clamp(e, wS, wE)]).filter(([s, e]) => e > s));
  const free = [];
  let cur = wS;
  for (const [s, e] of busy) {
    if (s > cur) free.push([cur, s]);
    cur = Math.max(cur, e);
  }
  if (cur < wE) free.push([cur, wE]);
  return free;
}

function isoToSeoulMinutes(dateIsoOrDate) {
  const d = dateIsoOrDate instanceof Date ? dateIsoOrDate : new Date(dateIsoOrDate);
  const p = toSeoulParts(d);
  return { ymd: `${p.y}-${pad2(p.m)}-${pad2(p.d)}`, min: p.hh * 60 + p.mm };
}

const HmSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .transform((s) => s);

const StudyWindowSchema = z
  .object({
    start: HmSchema,
    end: HmSchema,
  })
  .refine(
    (w) => {
      const [sh, sm] = w.start.split(":").map(Number);
      const [eh, em] = w.end.split(":").map(Number);
      const sMin = sh * 60 + sm;
      const eMin = eh * 60 + em;
      return (
        Number.isFinite(sMin) &&
        Number.isFinite(eMin) &&
        sMin >= 0 &&
        eMin <= 24 * 60 &&
        eMin > sMin
      );
    },
    { message: "studyWindow must be valid and end must be after start (HH:MM)." }
  );

const SuggestSchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  estimatedMinutes: z.number().int().min(1).max(24 * 60).optional().default(60),
  horizonDays: z.number().int().min(3).max(60).optional().default(14),
  // Optional override: lets the UI expand the daily planning window beyond the default 18:00–22:00.
  studyWindow: StudyWindowSchema.optional().nullable(),
});


export async function suggestTaskSchedule(userId, input) {
  const { dueDate, estimatedMinutes, horizonDays, studyWindow } = SuggestSchema.parse(input ?? {});

  const settings = await getUserSettings(userId);
  const effectiveWin = studyWindow ?? settings?.study_window;
  const studyWin = normalizeWindow(effectiveWin, "18:00", "22:00");
  const bufferMinutes = clamp(Number(settings?.buffer_minutes ?? 10), 0, 120);

  const todayYmd = toSeoulYmd(new Date());
  const maxEnd = addDaysYmd(todayYmd, horizonDays);
  const endYmd = dueDate ? (dueDate < maxEnd ? dueDate : maxEnd) : maxEnd;

  const rangeFromIso = ymdToSeoulIso(todayYmd, 0, 0);
  const rangeToIso = ymdToSeoulIso(endYmd, 23, 59);

  const blocks = await listCalendarBlocksByUserId(userId, { from: rangeFromIso, to: rangeToIso });
  const courses = await listCoursesByUserId(userId);

  // Bucket busy minutes by date (Seoul local)
  const busyByYmd = new Map(); // ymd -> [[startMin,endMin],...]
  for (const b of blocks) {
    const s = isoToSeoulMinutes(b.start_at);
    const e = isoToSeoulMinutes(b.end_at);

    // Handle same-day only; if spans multiple days, split (rare but safe)
    let curYmd = s.ymd;
    let curStart = s.min;
    while (true) {
      if (curYmd === e.ymd) {
        const arr = busyByYmd.get(curYmd) ?? [];
        arr.push([curStart, e.min]);
        busyByYmd.set(curYmd, arr);
        break;
      } else {
        const arr = busyByYmd.get(curYmd) ?? [];
        arr.push([curStart, 24 * 60]);
        busyByYmd.set(curYmd, arr);
        curYmd = addDaysYmd(curYmd, 1);
        curStart = 0;
      }
    }
  }


  // Add course meetings as busy time (recurring weekly inside [todayYmd, endYmd])
  // This ensures the scheduler does not suggest slots during class time.
  for (const c of courses) {
    const dow = normalizeDow(c.day_of_week);
    if (dow === null) continue;
    const st = timeToHm(c.start_time);
    const et = timeToHm(c.end_time);
    if (!st || !et) continue;

    const startMin = st.hh * 60 + st.mm;
    const endMin = et.hh * 60 + et.mm;
    if (!(endMin > startMin)) continue;

    // iterate ymd range and add interval to matching days
    let cur = todayYmd;
    while (cur <= endYmd) {
      // Determine day-of-week for this ymd in UTC, consistent with addDaysYmd (UTC stepping)
      const { y, m, d } = parseYmd(cur);
      const dateUtc = new Date(Date.UTC(y, m - 1, d));
      if (dateUtc.getUTCDay() === dow) {
        const arr = busyByYmd.get(cur) ?? [];
        arr.push([startMin, endMin]);
        busyByYmd.set(cur, arr);
      }
      cur = addDaysYmd(cur, 1);
    }
  }

  const days = [];
  let ymd = todayYmd;

  while (ymd <= endYmd) {
    const windowInterval = [studyWin.startMin, studyWin.endMin];

    const busy = busyByYmd.get(ymd) ?? [];
    // Apply buffer by expanding each busy interval
    const bufferedBusy = busy.map(([s, e]) => [Math.max(0, s - bufferMinutes), Math.min(24 * 60, e + bufferMinutes)]);

    const free = subtractIntervals(windowInterval, bufferedBusy);
    const freeMinutes = free.reduce((acc, [s, e]) => acc + (e - s), 0);

    const bestSlots = [];
    for (const [s, e] of free) {
      const len = e - s;
      if (len <= 0) continue;
      const startH = Math.floor(s / 60);
      const startM = s % 60;
      const endH = Math.floor(e / 60);
      const endM = e % 60;
      bestSlots.push({
        start: ymdToSeoulIso(ymd, startH, startM),
        end: ymdToSeoulIso(ymd, endH, endM),
        freeMinutes: len,
        fits: len >= estimatedMinutes,
      });
    }

    // Score: how well we can fit the task in the single-day window
    const maxSlot = bestSlots.reduce((m, s) => Math.max(m, s.freeMinutes), 0);
    const score = clamp(maxSlot / estimatedMinutes, 0, 1);

    let level = "red";
    if (score >= 1) level = "green";
    else if (score >= 0.5) level = "yellow";

    days.push({
      date: ymd,
      level,
      score,
      freeMinutes,
      slots: bestSlots
        .sort((a, b) => b.freeMinutes - a.freeMinutes)
        .slice(0, 6),
    });

    ymd = addDaysYmd(ymd, 1);
  }

  return {
    today: todayYmd,
    end: endYmd,
    studyWindow: { start: (studyWindow?.start ?? settings?.study_window?.start ?? "18:00"), end: (studyWindow?.end ?? settings?.study_window?.end ?? "22:00") },
    bufferMinutes,
    estimatedMinutes,
    days,
  };
}
