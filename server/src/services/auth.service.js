import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { conflict, unauthorized, badRequest } from "../utils/httpError.js";
import { createUser, findUserByEmail } from "../repositories/users.repo.js";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(72),
});

function signToken(user) {
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

  const { email, password, name } = parsed.data;

  const existing = await findUserByEmail(email.toLowerCase());
  if (existing) {
    throw conflict("Email is already registered", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({
    email: email.toLowerCase(),
    passwordHash,
    name,
  });

  const token = signToken(user);

  return { user, token };
}

export async function login(input) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw badRequest("Invalid login payload", "VALIDATION_ERROR");
  }

  const { email, password } = parsed.data;

  const userWithHash = await findUserByEmail(email.toLowerCase());
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
    created_at: userWithHash.created_at,
  };

  const token = signToken(user);

  return { user, token };
}
