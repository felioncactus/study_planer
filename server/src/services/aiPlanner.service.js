import { badRequest } from "../utils/httpError.js";
import { listCalendarBlocksByUserId } from "../repositories/calendarBlocks.repo.js";
import { getUserSettings } from "../repositories/userSettings.repo.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const SEOUL_OFFSET_MINUTES = 9 * 60;

function assertOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing. Add it to server/.env");
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-5.2";
}

function extractOutputText(response) {
  const output = Array.isArray(response?.output) ? response.output : [];
  const textParts = [];
  for (const item of output) {
    if (item?.type === "output_text" && typeof item.text === "string") textParts.push(item.text);
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === "output_text" && typeof c.text === "string") textParts.push(c.text);
      }
    }
  }
  return textParts.join("\n").trim();
}

async function openaiCreateResponse({ input, instructions }) {
  assertOpenAIKey();
  const body = { model: getModel(), input, instructions };
  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }
  return await res.json();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseHm(s) {
  const [hh, mm] = String(s || "0:0").split(":").map((x) => Number(x));
  return { hh: Number.isFinite(hh) ? hh : 0, mm: Number.isFinite(mm) ? mm : 0 };
}

function minutesFromHm(hm) {
  return hm.hh * 60 + hm.mm;
}

function toSeoulParts(dateObj) {
  const ms = dateObj.getTime() + SEOUL_OFFSET_MINUTES * 60_000;
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh: d.getUTCHours(), mm: d.getUTCMinutes() };
}

function toSeoulYmd(dateObj) {
  const p = toSeoulParts(dateObj);
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  const dateUtc = new Date(Date.UTC(y, m - 1, d));
  dateUtc.setUTCDate(dateUtc.getUTCDate() + days);
  return `${dateUtc.getUTCFullYear()}-${pad2(dateUtc.getUTCMonth() + 1)}-${pad2(dateUtc.getUTCDate())}`;
}

function ymdToSeoulIso(ymd, minutesFromMidnight) {
  const hh = Math.floor(minutesFromMidnight / 60);
  const mm = minutesFromMidnight % 60;
  return `${ymd}T${pad2(hh)}:${pad2(mm)}:00+09:00`;
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else out.push(cur);
  }
  return out;
}

function subtractIntervals(window, busy) {
  let free = [[window[0], window[1]]];
  for (const b of busy) {
    const next = [];
    for (const f of free) {
      if (b[1] <= f[0] || b[0] >= f[1]) {
        next.push(f);
        continue;
      }
      if (b[0] > f[0]) next.push([f[0], b[0]]);
      if (b[1] < f[1]) next.push([b[1], f[1]]);
    }
    free = next;
    if (!free.length) break;
  }
  return free;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeJsonParseMaybe(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  // try direct JSON
  try {
    return JSON.parse(raw);
  } catch {}
  // try extracting first {...} block
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

/**
 * Estimate task duration from title/description using OpenAI.
 * Returns: { estimatedMinutes, confidence, notes }
 */
export async function estimateTaskDuration({ title, description }) {
  const t = String(title || "").trim();
  const d = String(description || "").trim();
  if (!t && !d) throw badRequest("title or description required", "VALIDATION_ERROR");

  const instructions = [
    "You estimate how long a student needs to complete a task.",
    "Output ONLY valid JSON (no markdown).",
    "Round to nearest 5 minutes.",
    "If unsure, be conservative but realistic.",
    "Return minutes between 5 and 12*60.",
    "",
    "JSON schema:",
    "{",
    '  "estimatedMinutes": number,',
    '  "confidence": "low" | "medium" | "high",',
    '  "notes": string',
    "}",
  ].join("\n");

  const input = [
    { role: "user", content: `Title: ${t || "(none)"}\nDescription: ${d || "(none)"}` },
  ];

  const resp = await openaiCreateResponse({ input, instructions });
  const parsed = safeJsonParseMaybe(extractOutputText(resp)) || {};
  let minutes = Number(parsed.estimatedMinutes);
  if (!Number.isFinite(minutes)) minutes = 60;
  minutes = clamp(Math.round(minutes / 5) * 5, 5, 12 * 60);

  const confidence = ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium";
  const notes = typeof parsed.notes === "string" ? parsed.notes : "";

  return { estimatedMinutes: minutes, confidence, notes };
}

/**
 * AI planning for where to do the task within next N days.
 * - If a single slot can fit, returns mode=single with one block.
 * - Else returns mode=split with multiple blocks (parts).
 * This does not modify the DB; it only returns a proposed plan.
 */
export async function aiPlanTaskForUser(userId, { title, description, dueDate, estimatedMinutes, horizonDays, studyWindow }) {
  const t = String(title || "").trim();
  const d = String(description || "").trim();
  const est = Number(estimatedMinutes);
  if (!t) throw badRequest("title is required", "VALIDATION_ERROR");
  const totalMinutes = Number.isFinite(est) && est > 0 ? clamp(est, 5, 12 * 60) : 60;

  const settings = await getUserSettings(userId);
  const winStart = studyWindow?.start ?? settings?.study_window?.start ?? "18:00";
  const winEnd = studyWindow?.end ?? settings?.study_window?.end ?? "22:00";

  const h = Number.isFinite(Number(horizonDays)) ? clamp(Number(horizonDays), 1, 14) : 7;

  const now = new Date();
  const todayYmd = toSeoulYmd(now);
  const endYmd = addDaysYmd(todayYmd, h - 1);

  // Pull calendar blocks overlapping range
  const fromIso = `${todayYmd}T00:00:00+09:00`;
  const toIso = `${endYmd}T23:59:59+09:00`;
  const blocks = await listCalendarBlocksByUserId(userId, { from: fromIso, to: toIso });

  // Build busy intervals per day in minutes-from-midnight (Seoul)
  const perDayBusy = new Map(); // ymd -> [[startMin,endMin], ...]
  function pushBusy(ymd, sMin, eMin) {
    if (!perDayBusy.has(ymd)) perDayBusy.set(ymd, []);
    perDayBusy.get(ymd).push([clamp(sMin, 0, 24 * 60), clamp(eMin, 0, 24 * 60)]);
  }

  // Add sleep + meals as busy
  const sleep = settings?.sleep_window || { start: "00:00", end: "08:00" };
  const meals = Array.isArray(settings?.meal_windows) ? settings.meal_windows : [
    { start: "12:00", end: "13:00" },
    { start: "18:00", end: "19:00" },
  ];

  for (let i = 0; i < h; i++) {
    const ymd = addDaysYmd(todayYmd, i);

    const s0 = minutesFromHm(parseHm(sleep.start));
    const s1 = minutesFromHm(parseHm(sleep.end));
    // if sleep wraps over midnight, mark both sides
    if (s1 >= s0) {
      pushBusy(ymd, s0, s1);
    } else {
      pushBusy(ymd, 0, s1);
      pushBusy(ymd, s0, 24 * 60);
    }

    for (const mw of meals) {
      const m0 = minutesFromHm(parseHm(mw.start));
      const m1 = minutesFromHm(parseHm(mw.end));
      if (m1 > m0) pushBusy(ymd, m0, m1);
    }
  }

  for (const b of blocks) {
    const start = new Date(b.start_at);
    const end = new Date(b.end_at);
    const s = toSeoulParts(start);
    const e = toSeoulParts(end);
    const startYmd = `${s.y}-${pad2(s.m)}-${pad2(s.d)}`;
    const endYmd2 = `${e.y}-${pad2(e.m)}-${pad2(e.d)}`;

    if (startYmd === endYmd2) {
      pushBusy(startYmd, s.hh * 60 + s.mm, e.hh * 60 + e.mm);
      continue;
    }
    // spans midnight: split
    pushBusy(startYmd, s.hh * 60 + s.mm, 24 * 60);
    pushBusy(endYmd2, 0, e.hh * 60 + e.mm);
  }

  // Compute free intervals inside study window and also "general awake window" (08:00-24:00) as fallback.
  const winA = minutesFromHm(parseHm(winStart));
  const winB = minutesFromHm(parseHm(winEnd));
  const studyWin = [clamp(Math.min(winA, winB), 0, 24 * 60), clamp(Math.max(winA, winB), 0, 24 * 60)];
  const awakeWin = [8 * 60, 24 * 60];

  const freeByDay = [];
  for (let i = 0; i < h; i++) {
    const ymd = addDaysYmd(todayYmd, i);
    const busy = mergeIntervals(perDayBusy.get(ymd) || []);
    const freeStudy = subtractIntervals(studyWin, busy).filter((x) => x[1] - x[0] >= 15);
    const freeAwake = subtractIntervals(awakeWin, busy).filter((x) => x[1] - x[0] >= 15);
    freeByDay.push({ ymd, freeStudy, freeAwake });
  }

  // Provide the model with compact availability.
  const availability = freeByDay.map((d) => ({
    date: d.ymd,
    studyWindowFree: d.freeStudy.map(([s, e]) => ({ start: `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`, end: `${pad2(Math.floor(e / 60))}:${pad2(e % 60)}` })),
    awakeFree: d.freeAwake.map(([s, e]) => ({ start: `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`, end: `${pad2(Math.floor(e / 60))}:${pad2(e % 60)}` })),
  }));

  const instructions = [
    "You are an expert weekly planner for a student.",
    "Goal: schedule the task into the user's week based on availability, due date, and task complexity.",
    "",
    "Rules:",
    "- Prefer using studyWindowFree times first; only use awakeFree if studyWindowFree is insufficient.",
    "- Schedule earlier (so the user has time to revise) unless due date is far away.",
    "- If no single slot fits the total minutes, split into multiple parts (only if splittable makes sense).",
    "- Each part should be 25–90 minutes (unless total is smaller). Include short breaks by leaving 5–15 minutes gaps when possible.",
    "- Output ONLY valid JSON (no markdown).",
    "",
    "Output JSON schema:",
    "{",
    '  "mode": "single" | "split",',
    '  "blocks": [ { "date": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM", "minutes": number, "label": string } ],',
    '  "notes": string',
    "}",
  ].join("\n");

  const input = [
    {
      role: "user",
      content: JSON.stringify(
        {
          task: { title: t, description: d || null, dueDate: dueDate || null, estimatedMinutes: totalMinutes },
          preferences: { timezone: "Asia/Seoul", studyWindow: { start: winStart, end: winEnd } },
          availability,
        },
        null,
        2
      ),
    },
  ];

  const resp = await openaiCreateResponse({ input, instructions });
  const parsed = safeJsonParseMaybe(extractOutputText(resp)) || {};
  const mode = parsed.mode === "split" ? "split" : "single";
  const blocksIn = Array.isArray(parsed.blocks) ? parsed.blocks : [];

  // Validate blocks against computed free windows (soft-validate; if invalid, fall back to heuristic).
  const accepted = [];
  for (const b of blocksIn) {
    const date = String(b.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const s = parseHm(b.start);
    const e = parseHm(b.end);
    const sMin = minutesFromHm(s);
    const eMin = minutesFromHm(e);
    const mins = Number(b.minutes);
    const dur = eMin - sMin;
    if (!(dur > 0)) continue;
    const minutes = Number.isFinite(mins) ? mins : dur;
    accepted.push({
      date,
      start: ymdToSeoulIso(date, sMin),
      end: ymdToSeoulIso(date, eMin),
      minutes: clamp(Math.round(minutes / 5) * 5, 5, 12 * 60),
      label: typeof b.label === "string" ? b.label : t,
    });
  }

  // Fallback: choose earliest study-window slot(s)
  if (!accepted.length) {
    let remaining = totalMinutes;
    for (const d0 of freeByDay) {
      for (const [sMin, eMin] of d0.freeStudy) {
        if (remaining <= 0) break;
        const cap = eMin - sMin;
        const take = Math.min(cap, remaining);
        if (take < 15) continue;
        accepted.push({
          date: d0.ymd,
          start: ymdToSeoulIso(d0.ymd, sMin),
          end: ymdToSeoulIso(d0.ymd, sMin + take),
          minutes: take,
          label: accepted.length ? `${t} (Part ${accepted.length + 1})` : t,
        });
        remaining -= take;
      }
      if (remaining <= 0) break;
    }
  }

  const notes = typeof parsed.notes === "string" ? parsed.notes : "";

  return {
    range: { from: todayYmd, to: endYmd },
    studyWindow: { start: winStart, end: winEnd },
    totalMinutes,
    mode: accepted.length > 1 ? "split" : mode,
    blocks: accepted,
    notes,
  };
}
