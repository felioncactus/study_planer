import { http } from "./http";

export async function apiListCalendarEvents({ start, end }) {
  const res = await http.get("/calendar/events", { params: { start, end } });
  return res.data;
}
