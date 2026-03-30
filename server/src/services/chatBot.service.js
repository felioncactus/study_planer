
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

export async function askChatBot({ chatTitle, participants, history, question, askerName }) {
  assertOpenAIKey();

  const participantNames = participants.map((p) => p.name || p.email).join(", ");
  const recent = history.slice(-20).map((m) => ({
    role: m.sender_kind === "bot" ? "assistant" : "user",
    content: `${m.sender_kind === "bot" ? "Bot" : (m.sender_name || "User")}: ${m.body || ""}`,
  }));

  const instructions = [
    "You are the helpful shared bot inside a private chat application.",
    "Answer the latest user request clearly and directly.",
    "You may use markdown headings, bold, italics, and bullet lists.",
    "Keep privacy in mind and do not claim access to external systems unless explicitly provided in the prompt.",
    `Chat title: ${chatTitle || "Untitled chat"}.`,
    `Participants: ${participantNames || "Unknown"}.`,
    `The asking user is: ${askerName || "Unknown user"}.`,
  ].join(" ");

  const body = {
    model: getModel(),
    instructions,
    input: [
      ...recent,
      { role: "user", content: question },
    ],
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

  const json = await res.json();
  return extractOutputText(json) || "I could not generate a reply.";
}
