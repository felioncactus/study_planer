import { http } from "./http";

export async function apiListTasks(params = {}) {
  const res = await http.get("/tasks", { params });
  return res.data; // { tasks }
}

export async function apiCreateTask(payload) {
  const res = await http.post("/tasks", payload);
  return res.data; // { task }
}

export async function apiUpdateTask(taskId, payload) {
  const res = await http.put(`/tasks/${taskId}`, payload);
  return res.data; // { task }
}

export async function apiDeleteTask(taskId) {
  await http.delete(`/tasks/${taskId}`);
}

export async function apiTaskSummary() {
  const res = await http.get("/tasks/summary");
  return res.data; // { summary }
}

export async function apiUploadTaskAttachments(taskId, files) {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await http.post(`/tasks/${taskId}/attachments`, form);
  return res.data; // { attachments }
}

export async function apiListTaskAttachments(taskId) {
  const res = await http.get(`/tasks/${taskId}/attachments`);
  return res.data; // { attachments }
}

export async function apiDeleteTaskAttachment(taskId, attachmentId) {
  await http.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
}


export async function apiGetTask(taskId) {
  const res = await http.get(`/tasks/${taskId}`);
  return res.data; // { task }
}

export async function apiUploadTaskAttachment(taskId, file) {
  const form = new FormData();
  form.append("files", file);
  const res = await http.post(`/tasks/${taskId}/attachments`, form);
  // server returns { attachments: [...] }
  return res.data; // { attachments }
}


export async function apiTaskSuggestions(payload) {
  const res = await http.post('/tasks/suggestions', payload);
  return res.data; // { suggestions }
}


export async function apiEstimateTaskDuration({ title, description }) {
  const res = await http.post("/tasks/estimate-duration", { title, description });
  return res.data; // { estimate }
}

export async function apiAiPlanTask(payload) {
  const res = await http.post("/tasks/ai-plan", payload);
  return res.data; // { plan }
}
