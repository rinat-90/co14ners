import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import { userService } from "./user.service.js";
import { prisma } from "../lib/prisma.js";
import { sendPushToUser } from "../push/push.service.js";
import { sendFollowEmail } from "../lib/email.js";
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

  streak: protectedProcedure.query(({ ctx }) => userService.getStreak(ctx.user.id)),

  onThisDay: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();
    const currentYear = today.getFullYear();

    const completions = await prisma.completion.findMany({
      where: { userId: ctx.user.id, isPrivate: false },
      include: { mountain: { select: { name: true, altitude: true, difficulty: true } } },
    });

    return completions
      .filter((c) => {
        const d = new Date(c.completedAt);
        return d.getMonth() + 1 === month && d.getDate() === day && d.getFullYear() < currentYear;
      })
      .map((c) => ({
        id: c.id,
        mountainName: c.mountain.name,
        mountainAltitude: c.mountain.altitude,
        mountainDifficulty: c.mountain.difficulty,
        completedAt: c.completedAt,
        yearsAgo: currentYear - new Date(c.completedAt).getFullYear(),
      }))
      .sort((a, b) => a.yearsAgo - b.yearsAgo);
  }),

  personalBests: protectedProcedure.query(async ({ ctx }) => {
    const completions = await prisma.completion.findMany({
      where: { userId: ctx.user.id },
      orderBy: { completedAt: "asc" },
      include: { mountain: { select: { name: true, altitude: true, elevationGain: true } } },
    });

    if (completions.length === 0) return null;

    // First summit
    const first = completions[0];

    // Highest unique peak
    const uniqueByMountain = new Map<string, typeof completions[0]>();
    for (const c of completions) {
      if (!uniqueByMountain.has(c.mountainId)) uniqueByMountain.set(c.mountainId, c);
    }
    const highestPeak = [...uniqueByMountain.values()].sort((a, b) => b.mountain.altitude - a.mountain.altitude)[0];

    // Busiest month (most summits)
    const monthMap: Record<string, number> = {};
    for (const c of completions) {
      const key = new Date(c.completedAt).toISOString().slice(0, 7);
      monthMap[key] = (monthMap[key] ?? 0) + 1;
    }
    const [busiestMonthKey, busiestMonthCount] = Object.entries(monthMap).sort((a, b) => b[1] - a[1])[0];

    // Best elevation month (most total elevation gained)
    const elevMap: Record<string, number> = {};
    for (const c of completions) {
      const key = new Date(c.completedAt).toISOString().slice(0, 7);
      elevMap[key] = (elevMap[key] ?? 0) + (c.mountain.elevationGain ?? 0);
    }
    const elevEntries = Object.entries(elevMap).filter(([, e]) => e > 0).sort((a, b) => b[1] - a[1]);
    const bestElevMonth = elevEntries[0] ? { month: elevEntries[0][0], elevation: elevEntries[0][1] } : null;

    return {
      firstSummit: { mountainName: first.mountain.name, date: first.completedAt },
      highestPeak: { mountainName: highestPeak.mountain.name, altitude: highestPeak.mountain.altitude },
      busiestMonth: { month: busiestMonthKey, count: busiestMonthCount },
      bestElevMonth,
    };
  }),

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
        const actorName = ctx.user.name ?? ctx.user.email.split("@")[0];
        sendPushToUser(input.userId, {
          title: "New follower",
          body: `${actorName} started following you`,
          url: `/users/${ctx.user.id}`,
        }).catch(() => {});
        // Email notification (fire-and-forget)
        prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } })
          .then((followed) => {
            if (followed) sendFollowEmail(followed.email, actorName, ctx.user.id, input.userId).catch(() => {});
          })
          .catch(() => {});
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

  // Protected: searching by name/email exposes climbers' email addresses,
  // so it is only available to signed-in users.
  search: protectedProcedure
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

  notifPrefs: protectedProcedure.query(async ({ ctx }) => {
    return prisma.notificationPreference.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id },
      update: {},
    });
  }),

  updateNotifPrefs: protectedProcedure
    .input(z.object({
      emailOnFollow: z.boolean().optional(),
      emailOnComment: z.boolean().optional(),
      emailOnReview: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.notificationPreference.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, ...input },
        update: input,
      });
    }),

  suggestedFollows: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(5) }))
    .query(async ({ ctx, input }) => {
      // My summited mountain IDs
      const myCompletions = await prisma.completion.findMany({
        where: { userId: ctx.user.id },
        select: { mountainId: true },
      });
      const myPeakIds = new Set(myCompletions.map((c) => c.mountainId));

      if (myPeakIds.size === 0) return [];

      // Users I already follow (or myself)
      const alreadyFollowing = await prisma.follow.findMany({
        where: { followerId: ctx.user.id },
        select: { followingId: true },
      });
      const excludeIds = new Set([ctx.user.id, ...alreadyFollowing.map((f) => f.followingId)]);

      // All non-private completions for peaks I've done, excluding users I already follow
      const sharedCompletions = await prisma.completion.findMany({
        where: {
          mountainId: { in: [...myPeakIds] },
          isPrivate: false,
          userId: { notIn: [...excludeIds] },
        },
        select: {
          userId: true,
          mountainId: true,
          user: { select: { id: true, name: true, email: true, avatar: true, bio: true } },
        },
      });

      // Count shared peaks per user
      const sharedMap = new Map<string, { user: typeof sharedCompletions[0]["user"]; sharedPeaks: number }>();
      for (const c of sharedCompletions) {
        const entry = sharedMap.get(c.userId);
        if (entry) {
          entry.sharedPeaks++;
        } else {
          sharedMap.set(c.userId, { user: c.user, sharedPeaks: 1 });
        }
      }

      return [...sharedMap.values()]
        .sort((a, b) => b.sharedPeaks - a.sharedPeaks)
        .slice(0, input.limit)
        .map(({ user, sharedPeaks }) => ({ ...user, sharedPeaks }));
    }),

  friendsLeaderboard: protectedProcedure
    .input(z.object({ metric: z.enum(["summits", "elevation", "unique"]).default("summits") }))
    .query(async ({ ctx, input }) => {
      const follows = await prisma.follow.findMany({
        where: { followerId: ctx.user.id },
        select: { followingId: true },
      });
      // Include self in the ranking
      const groupIds = [ctx.user.id, ...follows.map((f) => f.followingId)];

      const completions = await prisma.completion.findMany({
        where: { isPrivate: false, userId: { in: groupIds } },
        select: {
          userId: true,
          mountainId: true,
          mountain: { select: { elevationGain: true } },
        },
      });

      const byUser = new Map<string, { totalSummits: number; totalElevation: number; uniquePeaks: Set<string> }>();
      for (const c of completions) {
        const agg = byUser.get(c.userId) ?? { totalSummits: 0, totalElevation: 0, uniquePeaks: new Set() };
        agg.totalSummits += 1;
        agg.totalElevation += c.mountain.elevationGain ?? 0;
        agg.uniquePeaks.add(c.mountainId);
        byUser.set(c.userId, agg);
      }

      // Ensure all group members appear even if 0 summits
      for (const id of groupIds) {
        if (!byUser.has(id)) byUser.set(id, { totalSummits: 0, totalElevation: 0, uniquePeaks: new Set() });
      }

      const sorted = [...byUser.entries()]
        .map(([userId, agg]) => ({ userId, totalSummits: agg.totalSummits, totalElevation: agg.totalElevation, uniquePeaks: agg.uniquePeaks.size }))
        .sort((a, b) => {
          if (input.metric === "elevation") return b.totalElevation - a.totalElevation;
          if (input.metric === "unique") return b.uniquePeaks - a.uniquePeaks;
          return b.totalSummits - a.totalSummits;
        });

      const users = await prisma.user.findMany({
        where: { id: { in: sorted.map((r) => r.userId) } },
        select: { id: true, name: true, email: true, avatar: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      return sorted.map((r, i) => ({
        rank: i + 1,
        isMe: r.userId === ctx.user.id,
        user: userMap.get(r.userId)!,
        totalSummits: r.totalSummits,
        totalElevation: r.totalElevation,
        uniquePeaks: r.uniquePeaks,
      }));
    }),

  compare: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      async function getStats(userId: string) {
        const [completions, user, achievementCount, streak] = await Promise.all([
          prisma.completion.findMany({
            where: { userId, isPrivate: false },
            select: {
              mountainId: true,
              mountain: { select: { altitude: true, name: true, elevationGain: true } },
            },
          }),
          prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true, avatar: true } }),
          prisma.userAchievement.count({ where: { userId } }),
          userService.getStreak(userId),
        ]);

        const uniqueMountainIds = new Set(completions.map((c) => c.mountainId));
        const totalElevation = completions.reduce((sum, c) => sum + (c.mountain.elevationGain ?? 0), 0);
        const topPeak = [...completions]
          .sort((a, b) => b.mountain.altitude - a.mountain.altitude)
          .find((_, i, arr) => arr.findIndex((x) => x.mountainId === arr[i].mountainId) === i)
          ?.mountain ?? null;

        return {
          user,
          totalSummits: completions.length,
          uniquePeaks: uniqueMountainIds.size,
          totalElevation,
          topPeak,
          achievementCount,
          currentStreak: streak.current,
          longestStreak: streak.longest,
        };
      }

      const [me, them] = await Promise.all([getStats(ctx.user.id), getStats(input.userId)]);
      return { me, them };
    }),

  rangeProgress: protectedProcedure.query(async ({ ctx }) => {
    const RANGE_LABELS: Record<string, string> = {
      SAWATCH:           "Sawatch Range",
      ELK:               "Elk Mountains",
      SAN_JUAN:          "San Juan Mountains",
      TENMILE_MOSQUITO:  "Tenmile / Mosquito",
      FRONT:             "Front Range",
      SANGRE_DE_CRISTO:  "Sangre de Cristo",
      OTHER:             "Other",
    };

    const [allMountains, completions] = await Promise.all([
      prisma.mountain.findMany({ select: { id: true, range: true } }),
      prisma.completion.findMany({
        where: { userId: ctx.user.id },
        select: { mountainId: true },
        distinct: ["mountainId"],
      }),
    ]);

    const summitedIds = new Set(completions.map((c) => c.mountainId));

    const totals: Record<string, number> = {};
    const done: Record<string, number> = {};
    for (const m of allMountains) {
      totals[m.range] = (totals[m.range] ?? 0) + 1;
      if (summitedIds.has(m.id)) done[m.range] = (done[m.range] ?? 0) + 1;
    }

    return Object.keys(totals)
      .filter((r) => r !== "OTHER")
      .map((range) => ({
        range,
        label: RANGE_LABELS[range] ?? range,
        total: totals[range] ?? 0,
        completed: done[range] ?? 0,
        isComplete: (done[range] ?? 0) >= totals[range] && totals[range] > 0,
        pct: Math.round(((done[range] ?? 0) / (totals[range] ?? 1)) * 100),
      }))
      .sort((a, b) => b.pct - a.pct);
  }),

  sharedSummits: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) return [];

      const [mine, theirs] = await Promise.all([
        prisma.completion.findMany({
          where: { userId: ctx.user.id },
          select: { mountainId: true },
          distinct: ["mountainId"],
        }),
        prisma.completion.findMany({
          where: { userId: input.userId, isPrivate: false },
          select: { mountainId: true },
          distinct: ["mountainId"],
        }),
      ]);

      const theirSet = new Set(theirs.map((c) => c.mountainId));
      const sharedIds = mine.map((c) => c.mountainId).filter((id) => theirSet.has(id));

      if (sharedIds.length === 0) return [];

      const mountains = await prisma.mountain.findMany({
        where: { id: { in: sharedIds } },
        select: { id: true, name: true, altitude: true, difficulty: true },
        orderBy: { altitude: "desc" },
      });

      return mountains;
    }),

  activityHeatmap: protectedProcedure.query(async ({ ctx }) => {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);

    const completions = await prisma.completion.findMany({
      where: { userId: ctx.user.id, completedAt: { gte: since } },
      select: { completedAt: true },
    });

    const countByDay: Record<string, number> = {};
    for (const c of completions) {
      const key = new Date(c.completedAt).toISOString().slice(0, 10);
      countByDay[key] = (countByDay[key] ?? 0) + 1;
    }
    return countByDay; // { "2025-06-15": 2, ... }
  }),

  leaderboard: publicProcedure
    .input(z.object({ metric: z.enum(["summits", "elevation", "unique"]).default("summits"), limit: z.number().int().min(1).max(100).default(25) }))
    .query(async ({ input }) => {
      // Fetch all non-private completions with mountain elevationGain
      const completions = await prisma.completion.findMany({
        where: { isPrivate: false },
        select: {
          userId: true,
          mountainId: true,
          mountain: { select: { elevationGain: true, altitude: true } },
        },
      });

      // Aggregate per user
      const byUser = new Map<string, { totalSummits: number; totalElevation: number; uniquePeaks: Set<string> }>();
      for (const c of completions) {
        const agg = byUser.get(c.userId) ?? { totalSummits: 0, totalElevation: 0, uniquePeaks: new Set() };
        agg.totalSummits += 1;
        agg.totalElevation += c.mountain.elevationGain ?? 0;
        agg.uniquePeaks.add(c.mountainId);
        byUser.set(c.userId, agg);
      }

      // Sort by requested metric
      const sorted = [...byUser.entries()]
        .map(([userId, agg]) => ({ userId, totalSummits: agg.totalSummits, totalElevation: agg.totalElevation, uniquePeaks: agg.uniquePeaks.size }))
        .sort((a, b) => {
          if (input.metric === "elevation") return b.totalElevation - a.totalElevation;
          if (input.metric === "unique") return b.uniquePeaks - a.uniquePeaks;
          return b.totalSummits - a.totalSummits;
        })
        .slice(0, input.limit);

      // Fetch user details
      const users = await prisma.user.findMany({
        where: { id: { in: sorted.map((r) => r.userId) } },
        select: { id: true, name: true, email: true, avatar: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      return sorted.map((r, i) => ({
        rank: i + 1,
        user: userMap.get(r.userId)!,
        totalSummits: r.totalSummits,
        totalElevation: r.totalElevation,
        uniquePeaks: r.uniquePeaks,
      }));
    }),
});
