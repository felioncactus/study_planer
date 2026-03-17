import { badRequest } from "../utils/httpError.js";
import { getNoteForUser } from "./courseNotes.service.js";

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

async function openaiCreateResponse({ input, instructions }) {
  assertOpenAIKey();
  const body = { model: getModel(), input, instructions };
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

function safeJsonParseMaybe(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function getNoteAiHelp(userId, { noteId, title, contentHtml, message, history }) {
  const userPrompt = String(message || "").trim();
  if (!userPrompt) throw badRequest("message is required", "VALIDATION_ERROR");

  let noteTitle = String(title || "").trim();
  let noteHtml = typeof contentHtml === "string" ? contentHtml : "";

  if (noteId) {
    const note = await getNoteForUser(userId, noteId);
    noteTitle = noteTitle || note.title;
    if (!noteHtml) noteHtml = note.content_html || "";
  }

  const chatHistory = Array.isArray(history) ? history : [];
  const compactHistory = chatHistory
    .filter((item) => item && typeof item.role === "string" && typeof item.content === "string")
    .slice(-8)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join("\n");

  const instructions = [
    "You are an academic note-writing assistant embedded inside a rich text editor.",
    "You help with grammar, spelling, clarity, structure, outlines, study notes, and rewriting.",
    "Return ONLY valid JSON. No markdown fences.",
    "Preserve HTML structure when editing. Use semantic tags like p, h1, h2, h3, ul, ol, li, strong, em, blockquote.",
    "Do not include script, style, iframe, form, input, button, or event-handler attributes.",
    "If the user asks for suggestions only, keep editedHtml equal to the original HTML.",
    "The chatMessage should explain what you changed or suggest next steps.",
    "",
    "JSON schema:",
    "{",
    '  "chatMessage": string,',
    '  "editedHtml": string',
    "}",
  ].join("\n");

  const input = [
    {
      role: "user",
      content: [
        `Note title: ${noteTitle || "(untitled)"}`,
        "Current note HTML:",
        noteHtml || "<p></p>",
        "",
        compactHistory ? `Recent chat history:\n${compactHistory}` : "Recent chat history: (none)",
        "",
        `User request: ${userPrompt}`,
      ].join("\n"),
    },
  ];

  const response = await openaiCreateResponse({ input, instructions });
  const parsed = safeJsonParseMaybe(extractOutputText(response)) || {};
  const chatMessage = typeof parsed.chatMessage === "string" && parsed.chatMessage.trim()
    ? parsed.chatMessage.trim()
    : "I reviewed the note and prepared a suggestion.";
  const editedHtml = typeof parsed.editedHtml === "string" && parsed.editedHtml.trim()
    ? parsed.editedHtml
    : noteHtml || "<p></p>";

  return { chatMessage, editedHtml };
}
