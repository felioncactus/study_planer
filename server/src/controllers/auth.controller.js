import { login, register } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const registerHandler = asyncHandler(async (req, res) => {
  const result = await register(req.body);
  res.status(201).json(result);
});

export const loginHandler = asyncHandler(async (req, res) => {
  const result = await login(req.body);
  res.status(200).json(result);
});

export const meHandler = asyncHandler(async (req, res) => {
  // req.user is set by requireAuth middleware
  res.json({ user: req.user });
});
