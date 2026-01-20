import { http } from "./http";

export async function fetchMessages(friendId) {
  const { data } = await http.get(`/messages/${friendId}`);
  return data;
}

export async function sendMessage(friendId, body) {
  const { data } = await http.post(`/messages/${friendId}`, { body });
  return data;
}
