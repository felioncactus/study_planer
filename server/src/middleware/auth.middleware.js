import jwt from "jsonwebtoken";
import { unauthorized } from "../utils/httpError.js";
import { findUserById } from "../repositories/users.repo.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return next(unauthorized("Missing Bearer token"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Always load user from DB so we don't bloat JWT (e.g., base64 avatars)
    const user = await findUserById(payload.sub);
    if (!user) {
      return next(unauthorized("User not found"));
    }

    req.user = user;
    return next();
  } catch {
    return next(unauthorized("Invalid or expired token"));
  }
}
