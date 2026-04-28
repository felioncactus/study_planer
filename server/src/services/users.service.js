import { z } from "zod";
import { badRequest, conflict } from "../utils/httpError.js";
import { findUserByEmail, updateUserById, deleteUserById } from "../repositories/users.repo.js";
import { signToken } from "./auth.service.js";

const MAX_AVATAR_LEN = 2_000_000;

const avatarSchema = z
  .string()
  .max(MAX_AVATAR_LEN)
  .refine((v) => v.startsWith("data:image/"), { message: "avatar must be a data:image/* URL" });

const updateMeSchema = z.object({
  email: z.string().email().max(255).optional(),
  name: z.string().min(1).max(100).optional(),
  avatarUrl: avatarSchema.optional().nullable(),
  language: z.enum(["en", "ru", "ko", "kk", "uz"]).optional(),
});

export async function updateMe(userId, input) {
  const parsed = updateMeSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest("Invalid update payload", "VALIDATION_ERROR");
  }

  const { email, name, avatarUrl, language } = parsed.data;

  if (email !== undefined) {
    const existing = await findUserByEmail(email);
    if (existing && existing.id !== userId) {
      throw conflict("Email already in use", "EMAIL_TAKEN");
    }
  }

  const user = await updateUserById(userId, {
    email,
    name,
    avatarUrl: avatarUrl === undefined ? undefined : avatarUrl,
    language,
  });

  const token = signToken(user);

  return { user, token };
}

export async function deleteMe(userId) {
  await deleteUserById(userId);
}
