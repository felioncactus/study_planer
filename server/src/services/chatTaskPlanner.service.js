import { createTask } from "../repositories/tasks.repo.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

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

function safeJsonParseMaybe(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  return null;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export async function planTasksForParticipants({ chat, participants, requester, prompt }) {
  assertOpenAIKey();
  const candidateParticipants = participants
    .filter((p) => p.user_id)
    .map((p) => ({ user_id: p.user_id, name: p.name || p.email || "User" }));

  const instructions = [
    "You are planning shared work for a private chat group.",
    "Return ONLY valid JSON.",
    "Split the work into participant-specific tasks.",
    "Each participant should receive only their own assignment, not the full list of every split task.",
    "Prefer a fair and realistic breakdown based on time, owners, and deadlines mentioned by the user.",
    "Use due_date in YYYY-MM-DD when the user states or strongly implies a date, otherwise null.",
    "Schema:",
    "{",
    '  "summary": string,',
    '  "assignments": [',
    "    {",
    '      "participant_name": string,',
    '      "title": string,',
    '      "description": string,',
    '      "estimated_minutes": number,',
    '      "priority": number,',
    '      "due_date": string | null',
    "    }",
    "  ]",
    "}",
  ].join("\n");

  const input = [{
    role: "user",
    content: JSON.stringify({
      chat_title: chat.title || "Group chat",
      requester: requester?.name || requester?.email || "User",
      participants: candidateParticipants.map((p) => p.name),
      request: prompt,
    }),
  }];

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: getModel(), instructions, input }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  const parsed = safeJsonParseMaybe(extractOutputText(await res.json())) || {};
  const assignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
  const created = [];

  for (const item of assignments) {
    const target = candidateParticipants.find((p) => String(p.name).toLowerCase() === String(item?.participant_name || "").trim().toLowerCase());
    if (!target || !String(item?.title || "").trim()) continue;
    const task = await createTask({
      userId: target.user_id,
      courseId: null,
      title: String(item.title).trim(),
      description: String(item.description || "").trim() || null,
      dueDate: item.due_date || null,
      status: "todo",
      estimatedMinutes: clamp(Number(item.estimated_minutes) || 60, 15, 12 * 60),
      priority: clamp(Number(item.priority) || 3, 1, 5),
      splittable: true,
    });
    created.push({
      user_id: target.user_id,
      participant_name: target.name,
      task_id: task.id,
      title: task.title,
      due_date: task.due_date,
      estimated_minutes: task.estimated_minutes,
    });
  }

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    created,
  };
}
