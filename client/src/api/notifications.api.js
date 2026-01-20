import { http } from "./http";

export async function fetchFriendNotifications() {
  const res = await http.get("/notifications/friends");
  return res.data;
}
