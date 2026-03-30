
import { http } from "./http";

export async function fetchMessages(friendId) {
  const { data } = await http.get(`/messages/${friendId}`);
  return data;
}

export async function sendMessage(friendId, body, attachments = []) {
  const form = new FormData();
  form.append("body", body);
  for (const file of attachments) {
    form.append("attachments", file);
  }
  const { data } = await http.post(`/messages/${friendId}`, form);
  return data;
}
