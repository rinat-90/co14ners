import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export interface TokenPayload {
  userId: string;
  role: Role;
}

function secret(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret("JWT_ACCESS_SECRET"), { expiresIn: "15m" });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret("JWT_REFRESH_SECRET"), { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, secret("JWT_ACCESS_SECRET")) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, secret("JWT_REFRESH_SECRET")) as TokenPayload;
}
