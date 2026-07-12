import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";

export const plannedHikeRouter = router({
  /** Current user's upcoming planned hikes (today or later). */
  myPlans: protectedProcedure.query(async ({ ctx }) => {
    const today = startOfToday();
    return prisma.plannedHike.findMany({
      where: { userId: ctx.user.id, plannedDate: { gte: today } },
      orderBy: { plannedDate: "asc" },
      include: {
        mountain: { select: { id: true, name: true, altitude: true, difficulty: true, range: true } },
      },
    });
  }),

  /** Public planned hikes for a mountain (upcoming only). */
  forMountain: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ input }) => {
      const today = startOfToday();
      return prisma.plannedHike.findMany({
        where: { mountainId: input.mountainId, isPublic: true, plannedDate: { gte: today } },
        orderBy: { plannedDate: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      });
    }),

  /** Create or update a plan for a mountain (one plan per user per mountain). */
  plan: protectedProcedure
    .input(
      z.object({
        mountainId: z.string(),
        plannedDate: z.string().date(), // "YYYY-MM-DD"
        isPublic: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plannedDate = new Date(input.plannedDate);
      return prisma.plannedHike.upsert({
        where: { userId_mountainId: { userId: ctx.user.id, mountainId: input.mountainId } },
        create: { userId: ctx.user.id, mountainId: input.mountainId, plannedDate, isPublic: input.isPublic },
        update: { plannedDate, isPublic: input.isPublic },
      });
    }),

  /** Cancel (delete) a planned hike by id. Only owner can cancel. */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.plannedHike.deleteMany({ where: { id: input.id, userId: ctx.user.id } });
      return { ok: true };
    }),

  /** Check if the current user has a plan for a specific mountain. */
  myPlanForMountain: protectedProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.plannedHike.findUnique({
        where: { userId_mountainId: { userId: ctx.user.id, mountainId: input.mountainId } },
      });
    }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
