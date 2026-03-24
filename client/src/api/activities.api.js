import { http } from "./http";

export async function apiListActivities(params = {}) {
  const res = await http.get("/activities", { params });
  return res.data; // { activities }
}

export async function apiCreateActivity(payload) {
  const res = await http.post("/activities", payload);
  return res.data; // { activity }
}

export async function apiUpdateActivity(activityId, payload) {
  const res = await http.put(`/activities/${activityId}`, payload);
  return res.data; // { activity }
}

export async function apiDeleteActivity(activityId) {
  await http.delete(`/activities/${activityId}`);
}

export async function apiGetActivity(activityId) {
  const res = await http.get(`/activities/${activityId}`);
  return res.data; // { activity }
}


export async function apiAiPlanActivity(payload) {
  const res = await http.post("/activities/ai-plan", payload);
  return res.data; // { plan }
}
