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

      const [recentCompletions, recentReviews] = await Promise.all([
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
        })),
        ...recentReviews.map((r) => ({
          id: `review-${r.id}`,
          type: "review" as const,
          date: r.createdAt,
          user: r.user,
          mountain: { ...r.mountain, slug: toSlug(r.mountain.name) },
          trail: null,
          rating: r.rating,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      return events;
    }),
});
