import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "@prisma/client";
import { verifyAccessToken } from "./lib/jwt.js";
import { prisma } from "./lib/prisma.js";

// ─── Context ──────────────────────────────────────────────────────────────────

export const createContext = async ({ req }: CreateExpressContextOptions) => {
  let user: User | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      user = await prisma.user.findUnique({ where: { id: payload.userId } });
    } catch {
      // Invalid / expired token — treat as unauthenticated
    }
  }

  return { user };
};

type Context = Awaited<ReturnType<typeof createContext>>;

// ─── tRPC instance ────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create();

export const router = t.router;

/** Open to anyone */
export const publicProcedure = t.procedure;

/** Requires a valid Bearer token — throws UNAUTHORIZED otherwise */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { user: ctx.user } });
});

/** Requires ADMIN role */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx: { user: ctx.user } });
});
