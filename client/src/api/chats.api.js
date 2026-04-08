
import { http } from "./http";

export async function fetchChats() {
  const { data } = await http.get("/chats");
  return data;
}

export async function fetchSelfChat() {
  const { data } = await http.get("/chats/self");
  return data;
}

export async function openDirectChat(userId) {
  const { data } = await http.post(`/chats/direct/${userId}`);
  return data;
}

export async function fetchChat(chatId) {
  const { data } = await http.get(`/chats/${chatId}`);
  return data;
}

export async function fetchChatMessages(chatId) {
  const { data } = await http.get(`/chats/${chatId}/messages`);
  return data;
}

export async function sendChatMessage(chatId, { body = "", attachments = [] } = {}) {
  const form = new FormData();
  form.append("body", body);
  for (const file of attachments) {
    form.append("attachments", file);
  }
  const { data } = await http.post(`/chats/${chatId}/messages`, form);
  return data;
}

export async function editChatMessage(chatId, messageId, { body }) {
  const { data } = await http.patch(`/chats/${chatId}/messages/${messageId}`, { body });
  return data;
}

export async function deleteChatMessage(chatId, messageId) {
  const { data } = await http.delete(`/chats/${chatId}/messages/${messageId}`);
  return data;
}

export async function clearChat(chatId) {
  const { data } = await http.delete(`/chats/${chatId}/messages`);
  return data;
}

export async function deleteChat(chatId) {
  const { data } = await http.delete(`/chats/${chatId}`);
  return data;
}

export async function createGroupChat({ title, memberIds }) {
  const { data } = await http.post("/chats/group", { title, memberIds });
  return data;
}


export async function createChatPoll(chatId, { question, options }) {
  const { data } = await http.post(`/chats/${chatId}/polls`, { question, options });
  return data;
}

export async function voteChatPoll(chatId, messageId, { optionIndex }) {
  const { data } = await http.post(`/chats/${chatId}/polls/${messageId}/vote`, { optionIndex });
  return data;
}

export async function createChatTimer(chatId, { title, durationMinutes, endsAt }) {
  const { data } = await http.post(`/chats/${chatId}/timers`, { title, durationMinutes, endsAt });
  return data;
}
