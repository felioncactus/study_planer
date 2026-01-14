import { badRequest } from "../utils/httpError.js";
import { createTaskForUser, listTasks, updateTaskForUser } from "./tasks.service.js";
import { listCourses, createCourseForUser } from "./courses.service.js";
import { scheduleWeekForUser } from "./scheduler.service.js";
import { listCalendarBlocksByUserId } from "../repositories/calendarBlocks.repo.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

function assertOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing. Add it to server/.env");
  }
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-5.2";
}

function extractOutputText(response) {
  const output = Array.isArray(response?.output) ? response.output : [];
  const textParts = [];
  for (const item of output) {
    if (item?.type === "output_text" && typeof item.text === "string") {
      textParts.push(item.text);
    }
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === "output_text" && typeof c.text === "string") {
          textParts.push(c.text);
        }
      }
    }
  }
  return textParts.join("\n").trim();
}

function toolSchemas() {
  // Strict mode requires:
  // - additionalProperties: false
  // - all fields required, but you can allow null in the type for "optional"
  return [
    {
      type: "function",
      name: "create_task",
      description:
        "Create a task for the current user. Use this when the user asks to add a task, homework, assignment, or reminder.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "Short title of the task." },
          description: { type: ["string", "null"], description: "Optional details (or null)." },
          due_date: {
            type: ["string", "null"],
            description: "Due date in YYYY-MM-DD (Asia/Seoul). If unknown, use null.",
          },
          estimated_minutes: {
            type: "integer",
            description: "Estimated time to complete in minutes. Default 60 if unknown.",
          },
          priority: {
            type: "integer",
            description: "Priority from 1 (lowest) to 5 (highest). Default 3.",
          },
          splittable: {
            type: "boolean",
            description: "If true, the scheduler may split into multiple blocks. Default true.",
          },
        },
        required: ["title", "description", "due_date", "estimated_minutes", "priority", "splittable"],
      },
    },
    {
      type: "function",
      name: "list_tasks",
      description:
        "List tasks for the current user. Use this when the user asks what they have to do, what is due today/this week, or for a task list.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: {
            type: ["string", "null"],
            enum: ["todo", "doing", "done", null],
            description: "Optional status filter. Use null to include all.",
          },
          from: { type: ["string", "null"], description: "Filter by due_date >= from (YYYY-MM-DD) or null." },
          to: { type: ["string", "null"], description: "Filter by due_date <= to (YYYY-MM-DD) or null." },
        },
        required: ["status", "from", "to"],
      },
    },
    {
      type: "function",
      name: "mark_task_done",
      description: "Mark a task as done when the user confirms they finished it.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          task_id: { type: "string", description: "Task UUID." },
        },
        required: ["task_id"],
      },
    },
    {
      type: "function",
      name: "schedule_week",
      description:
        "Build or rebuild a realistic schedule for the next N days from tasks and available study time. Use this when the user asks to plan their week, make a schedule, or rearrange tasks into a calendar.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          start_date: {
            type: ["string", "null"],
            description: "Start date in YYYY-MM-DD (Asia/Seoul). If null, use today.",
          },
          days: { type: "integer", description: "Number of days to schedule (default 7)." },
        },
        required: ["start_date", "days"],
      },
    },
    {
      type: "function",
      name: "get_schedule",
      description:
        "Get calendar blocks between two dates. Use this if the user asks 'what do I have today' in a time-based way or asks to see the plan.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          from: { type: "string", description: "Start date YYYY-MM-DD (Asia/Seoul)." },
          to: { type: "string", description: "End date YYYY-MM-DD (Asia/Seoul)." },
        },
        required: ["from", "to"],
      },
    },
    {
      type: "function",
      name: "list_courses",
      description:
        "List courses for the current user. Use this when the user asks what courses they have or how many courses.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
        required: [],
      },
    },
    {
      type: "function",
      name: "create_course",
      description: "Create a course for the current user when they ask to add a course.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Course name." },
          color: { type: ["string", "null"], description: "Optional color label (or null)." },
        },
        required: ["name", "color"],
      },
    },
  ];
}

async function openaiCreateResponse({ input, tools, instructions }) {
  assertOpenAIKey();

  const body = {
    model: getModel(),
    input,
    tools,
    instructions,
  };

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  return await res.json();
}

async function callTool(userId, name, args) {
  if (name === "create_task") {
    const task = await createTaskForUser(userId, {
      title: args.title,
      description: args.description,
      due_date: args.due_date,
      estimated_minutes: args.estimated_minutes,
      priority: args.priority,
      splittable: args.splittable,
    });
    return { ok: true, task };
  }

  if (name === "list_tasks") {
    const tasks = await listTasks(userId, {
      status: args.status ?? undefined,
      from: args.from ?? undefined,
      to: args.to ?? undefined,
    });
    return { ok: true, tasks };
  }

  if (name === "mark_task_done") {
    const task = await updateTaskForUser(userId, args.task_id, { status: "done" });
    return { ok: true, task };
  }

  if (name === "schedule_week") {
    const result = await scheduleWeekForUser(userId, {
      start_date: args.start_date ?? null,
      days: args.days ?? 7,
    });
    return { ok: true, ...result };
  }

  if (name === "get_schedule") {
    const fromIso = `${args.from}T00:00:00+09:00`;
    const toIso = `${args.to}T23:59:59+09:00`;
    const blocks = await listCalendarBlocksByUserId(userId, { from: fromIso, to: toIso });
    return { ok: true, blocks };
  }

  if (name === "list_courses") {
    const courses = await listCourses(userId);
    return { ok: true, courses, count: courses.length };
  }

  if (name === "create_course") {
    const course = await createCourseForUser(userId, { name: args.name, color: args.color });
    return { ok: true, course };
  }

  return { ok: false, error: `Unknown tool: ${name}` };
}

export async function runAssistantForUser(userId, messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw badRequest("messages must be a non-empty array", "VALIDATION_ERROR");
  }

  // Convert UI messages -> Responses input format
  // We only pass role + content (string).
  const input = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const instructions = `You are a study-planner assistant. Your job: help the user plan tasks and manage a realistic schedule.
- If the user asks to add a task, call create_task.
- If the user asks what they must do, call list_tasks.
- If the user asks to mark something complete, call mark_task_done.
- If the user asks to plan/rearrange their week, call schedule_week.
- If the user asks to see their schedule/plan for dates, call get_schedule.
- If the user asks about their courses, call list_courses. If they ask to add a course, call create_course.
- Never invent tasks, courses, or calendar events. Only refer to what tools return.
- Keep responses concise and actionable.
- If schedule_week returns unscheduled tasks, explain the tradeoffs (reduce duration, extend study window, move deadline, etc.).
`;

  const tools = toolSchemas();

  // Agentic loop: create response, run tool calls if any, send tool outputs back, repeat
  let curInput = [...input];
  let response = await openaiCreateResponse({ input: curInput, tools, instructions });

  const MAX_LOOPS = 4;

  for (let step = 0; step < MAX_LOOPS; step++) {
    const outputItems = Array.isArray(response.output) ? response.output : [];
    // IMPORTANT: Responses API requires we include the function_call item in the next input
    // before we send the corresponding function_call_output.
    curInput.push(...outputItems);

    const toolCalls = outputItems.filter((o) => o.type === "function_call");
    if (toolCalls.length === 0) break;

    for (const tc of toolCalls) {
      let args = {};
      if (typeof tc.arguments === "string" && tc.arguments.length) {
        try {
          args = JSON.parse(tc.arguments);
        } catch {
          args = {};
        }
      }

      const result = await callTool(userId, tc.name, args);

      curInput.push({
        type: "function_call_output",
        call_id: tc.call_id,
        output: JSON.stringify(result),
      });
    }

    response = await openaiCreateResponse({ input: curInput, tools, instructions });
  }

  const text = extractOutputText(response);
  return { text: text || "Done." };
}
