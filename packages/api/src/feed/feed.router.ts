import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const feedRouter = router({
  list: publicProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const { cursor, limit } = input;

      const [recentCompletions, recentReviews, recentReports] = await Promise.all([
        prisma.completion.findMany({
          where: { isPrivate: false },
          orderBy: { completedAt: "desc" },
          take: limit * 2,
          include: {
            user: { select: { id: true, name: true, email: true } },
            mountain: { select: { id: true, name: true, altitude: true, difficulty: true } },
            trail: { select: { name: true } },
          },
        }),
        prisma.review.findMany({
          orderBy: { createdAt: "desc" },
          take: limit * 2,
          include: {
            user: { select: { id: true, name: true, email: true } },
            mountain: { select: { id: true, name: true, altitude: true, difficulty: true } },
          },
        }),
        prisma.tripReport.findMany({
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
          take: limit * 2,
          include: {
            user: { select: { id: true, name: true, email: true } },
            mountain: { select: { id: true, name: true, altitude: true, difficulty: true } },
            trail: { select: { name: true } },
          },
        }),
      ]);

      // Merge & sort by date
      const events = [
        ...recentCompletions.map((c) => ({
          id: `completion-${c.id}`,
          type: "summit" as const,
          date: c.completedAt,
          user: c.user,
          mountain: { ...c.mountain, slug: toSlug(c.mountain.name) },
          trail: c.trail,
          rating: null as number | null,
          reportTitle: null as string | null,
          conditions: null as string | null,
        })),
        ...recentReviews.map((r) => ({
          id: `review-${r.id}`,
          type: "review" as const,
          date: r.createdAt,
          user: r.user,
          mountain: { ...r.mountain, slug: toSlug(r.mountain.name) },
          trail: null,
          rating: r.rating,
          reportTitle: null as string | null,
          conditions: null as string | null,
        })),
        ...recentReports.map((rp) => ({
          id: `report-${rp.id}`,
          type: "report" as const,
          date: rp.createdAt,
          user: rp.user,
          mountain: { ...rp.mountain, slug: toSlug(rp.mountain.name) },
          trail: rp.trail,
          rating: null as number | null,
          reportTitle: rp.title,
          conditions: rp.conditions,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      return events;
    }),

  leaderboard: publicProcedure.query(async () => {
    // Unique (userId, mountainId) pairs to count distinct summits per user
    const unique = await prisma.completion.findMany({
      distinct: ["userId", "mountainId"],
      select: { userId: true, mountainId: true },
    });

    // Count unique peaks per user
    const peakCount = new Map<string, number>();
    for (const { userId } of unique) {
      peakCount.set(userId, (peakCount.get(userId) ?? 0) + 1);
    }

    const top10 = [...peakCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const userIds = top10.map(([id]) => id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    // Get highest peak per user for tiebreaker display
    const highestPeaks = await prisma.completion.findMany({
      where: { userId: { in: userIds } },
      include: { mountain: { select: { altitude: true } } },
      orderBy: { mountain: { altitude: "desc" } },
    });
    const highestMap = new Map<string, number>();
    for (const c of highestPeaks) {
      if (!highestMap.has(c.userId)) highestMap.set(c.userId, c.mountain.altitude);
    }

    const userMap = new Map(users.map((u) => [u.id, u]));

    return top10.map(([userId, uniquePeaks], i) => ({
      rank: i + 1,
      userId,
      name: userMap.get(userId)?.name ?? userMap.get(userId)?.email?.split("@")[0] ?? "Unknown",
      uniquePeaks,
      highestPeak: highestMap.get(userId) ?? 0,
    }));
  }),
});
