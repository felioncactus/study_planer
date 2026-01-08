import { http } from "./http";

export async function apiRegister(payload) {
  const res = await http.post("/auth/register", payload);
  return res.data; // { user, token }
}

export async function apiLogin(payload) {
  const res = await http.post("/auth/login", payload);
  return res.data; // { user, token }
}

export async function apiMe() {
  const res = await http.get("/auth/me");
  return res.data; // { user }
}
