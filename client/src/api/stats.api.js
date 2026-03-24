
import { http } from "./http";

export async function apiGetStats() {
  const res = await http.get("/stats");
  return res.data; // { stats }
}
