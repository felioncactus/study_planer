import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { conflict, unauthorized, badRequest } from "../utils/httpError.js";
import { createUser, findUserByEmail } from "../repositories/users.repo.js";

const MAX_AVATAR_LEN = 2_000_000; // ~2MB text (data URL). Keeps DB sane.

const avatarSchema = z
  .string()
  .max(MAX_AVATAR_LEN)
  .refine((v) => v.startsWith("data:image/"), { message: "avatar must be a data:image/* URL" });

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(100),
  avatarUrl: avatarSchema.optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(72),
});

export function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(
    { email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { subject: user.id, expiresIn }
  );
}

export async function register(input) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest("Invalid register payload", "VALIDATION_ERROR");
  }

  const { email, password, name, avatarUrl } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    throw conflict("Email already registered", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await createUser({ email, passwordHash, name, avatarUrl: avatarUrl ?? null });

  const token = signToken(user);

  return { user, token };
}

export async function login(input) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest("Invalid login payload", "VALIDATION_ERROR");
  }

  const { email, password } = parsed.data;

  const userWithHash = await findUserByEmail(email);
  if (!userWithHash) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const ok = await bcrypt.compare(password, userWithHash.password_hash);
  if (!ok) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const user = {
    id: userWithHash.id,
    email: userWithHash.email,
    name: userWithHash.name,
    avatar_url: userWithHash.avatar_url ?? null,
    created_at: userWithHash.created_at,
    updated_at: userWithHash.updated_at,
  };

  const token = signToken(user);

  return { user, token };
}
