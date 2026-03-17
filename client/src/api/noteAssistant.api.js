import { http } from "./http";

export async function apiNoteAssistantHelp(payload) {
  const res = await http.post("/assistant/notes/help", payload);
  return res.data;
}
