
import { getProductivityStats } from "../repositories/stats.repo.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function canUseAi() {
  return !!process.env.OPENAI_API_KEY;
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-5.2";
}

function extractOutputText(response) {
  const output = Array.isArray(response?.output) ? response.output : [];
  const parts = [];
  for (const item of output) {
    if (item?.type === "output_text" && typeof item.text === "string") parts.push(item.text);
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
      }
    }
  }
  return parts.join("\n").trim();
}

async function openaiCreateResponse({ input, instructions }) {
  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: getModel(), input, instructions }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  return await res.json();
}

function buildFallbackInsight(stats) {
  const total = Number(stats.taskSummary?.total || 0);
  const done = Number(stats.taskSummary?.done || 0);
  const overdue = Number(stats.taskSummary?.overdue || 0);
  const dueSoon = Number(stats.taskSummary?.due_next_7_days || 0);
  const avgOpen = Number(stats.taskSummary?.avg_open_task_minutes || 0);
  const topCourse = stats.topCourses?.[0];

  const bits = [];
  bits.push(`You have completed ${done} of ${total} tasks so far.`);
  if (overdue > 0) bits.push(`${overdue} task${overdue === 1 ? "" : "s"} are overdue, so clearing old work should be the first priority.`);
  if (dueSoon > 0) bits.push(`${dueSoon} open task${dueSoon === 1 ? "" : "s"} are due in the next 7 days.`);
  if (avgOpen > 0) bits.push(`Your average remaining task estimate is about ${avgOpen} minutes.`);
  if (topCourse?.open_tasks > 0) bits.push(`${topCourse.name} has the heaviest current load with ${topCourse.open_tasks} open task${topCourse.open_tasks === 1 ? "" : "s"}.`);
  return bits.join(" ");
}

async function buildAiInsight(stats) {
  if (!canUseAi()) return buildFallbackInsight(stats);

  const instructions = [
    "You are an academic productivity analyst.",
    "Write one short paragraph (max 90 words).",
    "Focus on useful insights, not generic motivation.",
    "Mention the most important trend, risk, and next best action.",
    "Do not use markdown bullets.",
  ].join("\n");

  const input = [
    {
      role: "user",
      content: JSON.stringify(stats),
    },
  ];

  try {
    const response = await openaiCreateResponse({ input, instructions });
    return extractOutputText(response) || buildFallbackInsight(stats);
  } catch {
    return buildFallbackInsight(stats);
  }
}

export async function getStatsForUser(userId) {
  const stats = await getProductivityStats(userId);

  const total = Number(stats.taskSummary?.total || 0);
  const done = Number(stats.taskSummary?.done || 0);
  const overdue = Number(stats.taskSummary?.overdue || 0);
  const dueSoon = Number(stats.taskSummary?.due_next_7_days || 0);
  const taskMinutes7d = stats.calendarLoad.reduce((sum, day) => sum + Number(day.task_minutes || 0), 0);
  const activityMinutes7d = stats.calendarLoad.reduce((sum, day) => sum + Number(day.activity_minutes || 0), 0);

  const derived = {
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    overdueRate: total > 0 ? Math.round((overdue / total) * 100) : 0,
    next7DayLoadMinutes: dueSoon * Number(stats.taskSummary?.avg_open_task_minutes || 0),
    scheduledTaskMinutesLast7Days: taskMinutes7d,
    scheduledActivityMinutesLast7Days: activityMinutes7d,
  };

  const insight = await buildAiInsight({ ...stats, derived });

  return { ...stats, derived, insight };
}
