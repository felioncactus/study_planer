import { http } from "./http";

export async function apiAssistantMessage(messages) {
  const res = await http.post("/assistant/message", { messages });
  return res.data; // { message }
}
