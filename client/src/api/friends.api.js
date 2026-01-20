import { http } from "./http";

export async function fetchFriends() {
  const { data } = await http.get("/friends");
  return data;
}

export async function requestFriend(email) {
  const { data } = await http.post("/friends/request", { email });
  return data;
}

export async function acceptFriend(userId) {
  const { data } = await http.post("/friends/accept", { userId });
  return data;
}

export async function removeFriend(userId) {
  await http.delete(`/friends/${userId}`);
}

export async function blockUser(userId) {
  const { data } = await http.post("/friends/block", { userId });
  return data;
}

export async function unblockUser(userId) {
  await http.post("/friends/unblock", { userId });
}
