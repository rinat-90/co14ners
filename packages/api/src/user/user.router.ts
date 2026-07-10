import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import { userService } from "./user.service.js";
import { prisma } from "../lib/prisma.js";
import {
  logSummitSchema,
  updateCompletionSchema,
  deleteCompletionSchema,
  favoriteSchema,
  updateEmailSchema,
  updatePasswordSchema,
} from "./user.schema.js";

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => userService.getProfile(ctx.user.id)),

  stats: protectedProcedure.query(({ ctx }) => userService.getStats(ctx.user.id)),

  climbingStats: protectedProcedure.query(async ({ ctx }) => {
    const completions = await prisma.completion.findMany({
      where: { userId: ctx.user.id },
      orderBy: { completedAt: "asc" },
      include: {
        mountain: {
          select: { altitude: true, range: true, elevationGain: true, difficulty: true, name: true },
        },
      },
    });

    // Summits per month (last 24 months)
    const monthMap: Record<string, number> = {};
    const elevMap: Record<string, number> = {};
    completions.forEach((c) => {
      const key = new Date(c.completedAt).toISOString().slice(0, 7); // "YYYY-MM"
      monthMap[key] = (monthMap[key] ?? 0) + 1;
      elevMap[key] = (elevMap[key] ?? 0) + (c.mountain.elevationGain ?? 0);
    });

    // Range breakdown
    const rangeMap: Record<string, number> = {};
    completions.forEach((c) => {
      rangeMap[c.mountain.range] = (rangeMap[c.mountain.range] ?? 0) + 1;
    });

    // Difficulty breakdown (unique mountains)
    const diffMap: Record<string, number> = {};
    const seen = new Set<string>();
    completions.forEach((c) => {
      if (!seen.has(c.mountainId)) {
        seen.add(c.mountainId);
        diffMap[c.mountain.difficulty] = (diffMap[c.mountain.difficulty] ?? 0) + 1;
      }
    });

    // Top 5 highest peaks summited
    const topPeaks = [...completions]
      .sort((a, b) => b.mountain.altitude - a.mountain.altitude)
      .filter((c, i, arr) => arr.findIndex((x) => x.mountainId === c.mountainId) === i)
      .slice(0, 5)
      .map((c) => ({ name: c.mountain.name, altitude: c.mountain.altitude, date: c.completedAt }));

    // Cumulative summits over time
    let running = 0;
    const cumulative = completions.map((c) => {
      running++;
      return { date: new Date(c.completedAt).toISOString().slice(0, 10), count: running };
    });

    return {
      byMonth: Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count, elevationGained: elevMap[month] ?? 0 })),
      byRange: Object.entries(rangeMap).map(([range, count]) => ({ range, count })),
      byDifficulty: Object.entries(diffMap).map(([difficulty, count]) => ({ difficulty, count })),
      topPeaks,
      cumulative,
    };
  }),

  completions: protectedProcedure.query(({ ctx }) => userService.getCompletions(ctx.user.id)),

  favorites: protectedProcedure.query(({ ctx }) => userService.getFavorites(ctx.user.id)),

  logSummit: protectedProcedure
    .input(logSummitSchema)
    .mutation(({ ctx, input }) => userService.logSummit(ctx.user.id, input)),

  updateCompletion: protectedProcedure
    .input(updateCompletionSchema)
    .mutation(({ ctx, input }) => userService.updateCompletion(ctx.user.id, input.id, input)),

  deleteCompletion: protectedProcedure
    .input(deleteCompletionSchema)
    .mutation(({ ctx, input }) => userService.deleteCompletion(ctx.user.id, input.id)),

  addFavorite: protectedProcedure
    .input(favoriteSchema)
    .mutation(({ ctx, input }) => userService.addFavorite(ctx.user.id, input.mountainId)),

  removeFavorite: protectedProcedure
    .input(favoriteSchema)
    .mutation(({ ctx, input }) => userService.removeFavorite(ctx.user.id, input.mountainId)),

  isFavorite: protectedProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ ctx, input }) => userService.isFavorite(ctx.user.id, input.mountainId)),

  myCompletion: protectedProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ ctx, input }) => userService.myCompletion(ctx.user.id, input.mountainId)),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80).optional(),
        bio: z.string().max(300).optional(),
        // Accepts a URL or a base64 data URI (capped at ~150 KB encoded)
        avatar: z.string().max(204800).nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) => userService.updateProfile(ctx.user.id, input)),

  updateEmail: protectedProcedure
    .input(updateEmailSchema)
    .mutation(({ ctx, input }) => userService.updateEmail(ctx.user.id, input.newEmail, input.currentPassword)),

  updatePassword: protectedProcedure
    .input(updatePasswordSchema)
    .mutation(({ ctx, input }) => userService.updatePassword(ctx.user.id, input.currentPassword, input.newPassword)),

  achievements: protectedProcedure.query(({ ctx }) => userService.getAchievements(ctx.user.id)),

  publicProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => userService.getPublicProfile(input.userId)),

  follow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) throw new Error("Cannot follow yourself");
      const existing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: ctx.user.id, followingId: input.userId } },
      });
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: ctx.user.id, followingId: input.userId } },
        create: { followerId: ctx.user.id, followingId: input.userId },
        update: {},
      });
      // Notify the followed user only on a new follow (not re-follow)
      if (!existing) {
        await prisma.notification.create({
          data: { userId: input.userId, actorId: ctx.user.id, type: "FOLLOW" },
        });
      }
      return { ok: true };
    }),

  unfollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.follow.deleteMany({
        where: { followerId: ctx.user.id, followingId: input.userId },
      });
      return { ok: true };
    }),

  isFollowing: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: ctx.user.id, followingId: input.userId } },
      });
      return { isFollowing: !!follow };
    }),

  followCounts: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [followers, following] = await Promise.all([
        prisma.follow.count({ where: { followingId: input.userId } }),
        prisma.follow.count({ where: { followerId: input.userId } }),
      ]);
      return { followers, following };
    }),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(80) }))
    .query(async ({ input }) => {
      return prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, avatar: true, bio: true },
        take: 20,
        orderBy: { name: "asc" },
      });
    }),

  followers: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const rows = await prisma.follow.findMany({
        where: { followingId: input.userId },
        orderBy: { createdAt: "desc" },
        include: { follower: { select: { id: true, name: true, email: true, avatar: true, bio: true } } },
      });
      return rows.map((r) => r.follower);
    }),

  following: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const rows = await prisma.follow.findMany({
        where: { followerId: input.userId },
        orderBy: { createdAt: "desc" },
        include: { following: { select: { id: true, name: true, email: true, avatar: true, bio: true } } },
      });
      return rows.map((r) => r.following);
    }),
});
