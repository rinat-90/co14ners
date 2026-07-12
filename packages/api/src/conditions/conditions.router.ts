import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";
import type { ConditionType } from "../generated/prisma/index.js";

const CONDITION_TYPES = ["CLEAR", "SNOW", "ICY", "MUDDY", "WINDY"] as const;
const STALE_HOURS = 48;

export const conditionsRouter = router({
  /** Log a quick condition check-in for a mountain. */
  checkIn: protectedProcedure
    .input(z.object({
      mountainId: z.string(),
      condition: z.enum(CONDITION_TYPES),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.conditionCheckIn.create({
        data: {
          userId: ctx.user.id,
          mountainId: input.mountainId,
          condition: input.condition,
        },
      });
    }),

  /** Recent check-ins for a single mountain (last 48h). */
  forMountain: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ input }) => {
      const since = staleCutoff();
      const rows = await prisma.conditionCheckIn.findMany({
        where: { mountainId: input.mountainId, checkedAt: { gte: since } },
        orderBy: { checkedAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      });
      return rows;
    }),

  /** Aggregated latest condition per mountain (for mountain list badges). */
  allRecent: publicProcedure.query(async () => {
    const since = staleCutoff();

    // Fetch all recent check-ins
    const rows = await prisma.conditionCheckIn.findMany({
      where: { checkedAt: { gte: since } },
      orderBy: { checkedAt: "desc" },
      select: { mountainId: true, condition: true, checkedAt: true },
    });

    // Keep only the most recent check-in per mountain + count per condition
    const byMountain = new Map<string, {
      latest: ConditionType;
      latestAt: Date;
      counts: Record<string, number>;
      total: number;
    }>();

    for (const r of rows) {
      const entry = byMountain.get(r.mountainId);
      if (!entry) {
        byMountain.set(r.mountainId, {
          latest: r.condition,
          latestAt: r.checkedAt,
          counts: { [r.condition]: 1 },
          total: 1,
        });
      } else {
        entry.counts[r.condition] = (entry.counts[r.condition] ?? 0) + 1;
        entry.total++;
      }
    }

    // Convert to array
    return [...byMountain.entries()].map(([mountainId, v]) => ({
      mountainId,
      latest: v.latest,
      latestAt: v.latestAt,
      counts: v.counts,
      total: v.total,
    }));
  }),

  /** My most recent check-in for a mountain (to highlight the active button). */
  myCheckIn: protectedProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ ctx, input }) => {
      const since = staleCutoff();
      return prisma.conditionCheckIn.findFirst({
        where: { userId: ctx.user.id, mountainId: input.mountainId, checkedAt: { gte: since } },
        orderBy: { checkedAt: "desc" },
      });
    }),
});

function staleCutoff(): Date {
  return new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
}
