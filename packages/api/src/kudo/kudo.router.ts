import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";

const targetTypeSchema = z.enum(["COMPLETION", "TRIP_REPORT"]);

export const kudoRouter = router({
  /** Toggle a kudo on/off. Returns new kudoed state + count. */
  toggle: protectedProcedure
    .input(z.object({ targetId: z.string(), targetType: targetTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      const { targetId, targetType } = input;
      const userId = ctx.user.id;

      const existing = await prisma.kudo.findUnique({
        where: { userId_targetId_targetType: { userId, targetId, targetType } },
      });

      if (existing) {
        await prisma.kudo.delete({ where: { id: existing.id } });
      } else {
        await prisma.kudo.create({ data: { userId, targetId, targetType } });

        // Notify the owner of the target (fire-and-forget)
        notifyOwner(userId, targetId, targetType).catch(() => {});
      }

      const count = await prisma.kudo.count({ where: { targetId, targetType } });
      return { kudoed: !existing, count };
    }),

  /** Batch-fetch kudo counts + whether the current user has kudoed each target. */
  counts: publicProcedure
    .input(z.object({ targets: z.array(z.object({ id: z.string(), type: targetTypeSchema })) }))
    .query(async ({ ctx, input }) => {
      if (input.targets.length === 0) return {};

      const userId = ctx.user?.id ?? null;

      // One query per unique targetType group to keep it simple
      const completionIds = input.targets.filter((t) => t.type === "COMPLETION").map((t) => t.id);
      const reportIds = input.targets.filter((t) => t.type === "TRIP_REPORT").map((t) => t.id);

      const [completionKudos, reportKudos] = await Promise.all([
        completionIds.length > 0
          ? prisma.kudo.findMany({
              where: { targetId: { in: completionIds }, targetType: "COMPLETION" },
              select: { targetId: true, userId: true },
            })
          : Promise.resolve([]),
        reportIds.length > 0
          ? prisma.kudo.findMany({
              where: { targetId: { in: reportIds }, targetType: "TRIP_REPORT" },
              select: { targetId: true, userId: true },
            })
          : Promise.resolve([]),
      ]);

      const all = [...completionKudos, ...reportKudos];

      const result: Record<string, { count: number; kudoed: boolean }> = {};
      for (const t of input.targets) {
        const rows = all.filter((k) => k.targetId === t.id);
        result[t.id] = {
          count: rows.length,
          kudoed: userId ? rows.some((k) => k.userId === userId) : false,
        };
      }
      return result;
    }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function notifyOwner(actorId: string, targetId: string, targetType: "COMPLETION" | "TRIP_REPORT") {
  let ownerId: string | null = null;

  if (targetType === "COMPLETION") {
    const completion = await prisma.completion.findUnique({ where: { id: targetId }, select: { userId: true } });
    ownerId = completion?.userId ?? null;
  } else {
    const report = await prisma.tripReport.findUnique({ where: { id: targetId }, select: { userId: true } });
    ownerId = report?.userId ?? null;
  }

  if (!ownerId || ownerId === actorId) return;

  await prisma.notification.create({
    data: { userId: ownerId, actorId, type: "KUDO_RECEIVED" },
  });
}
