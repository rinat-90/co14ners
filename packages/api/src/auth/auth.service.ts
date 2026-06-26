import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { sendPasswordResetEmail } from "../lib/email.js";

const BCRYPT_ROUNDS = 12;
const REFRESH_EXPIRY_DAYS = 7;
const RESET_EXPIRY_HOURS = 1;

async function generateTokens(userId: string, role: Role) {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = signRefreshToken({ userId, role });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

  await prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });

  return { accessToken, refreshToken };
}

export const authService = {
  async register(email: string, password: string, name?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({ data: { email, passwordHash, name } });

    return generateTokens(user.id, user.role);
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // Constant-time check to avoid email enumeration
    if (!user || !valid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    return generateTokens(user.id, user.role);
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { success: true };
  },

  async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired refresh token" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid refresh token" });
    }

    // Rotate: delete old token, issue new pair
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });

    return generateTokens(user.id, user.role);
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always succeed — prevents email enumeration
    if (!user) return { success: true };

    const token = randomUUID();
    const expiry = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
    });

    await sendPasswordResetEmail(email, token);
    return { success: true };
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { resetPasswordToken: token, resetPasswordExpiry: { gt: new Date() } },
    });

    if (!user) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPasswordToken: null, resetPasswordExpiry: null },
    });

    // Invalidate all existing sessions after password reset
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { success: true };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return user;
  },
};
