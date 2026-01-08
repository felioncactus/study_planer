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
