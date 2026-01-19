import { http } from "./http";

export async function apiUpdateMe(payload) {
  const res = await http.patch("/users/me", payload);
  return res.data; // { user, token }
}

export async function apiDeleteMe() {
  const res = await http.delete("/users/me");
  return res.data;
}
