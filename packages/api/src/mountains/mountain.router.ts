import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../trpc.js";
import { mountainService } from "./mountain.service.js";
import { listMountainsSchema, getMountainSchema, getMountainBySlugSchema } from "./mountain.schema.js";
import { prisma } from "../lib/prisma.js";
import { TRPCError } from "@trpc/server";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const mountainRouter = router({
  list: publicProcedure
    .input(listMountainsSchema)
    .query(({ input }) => mountainService.list(input)),

  get: publicProcedure
    .input(getMountainSchema)
    .query(({ input }) => mountainService.getById(input.id)),

  getBySlug: publicProcedure
    .input(getMountainBySlugSchema)
    .query(({ input }) => mountainService.getBySlug(input.slug)),

  globalStats: publicProcedure
    .query(() => mountainService.globalStats()),

  nearby: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ input }) => mountainService.nearby(input.mountainId)),

  recentConditions: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ input }) => mountainService.recentConditions(input.mountainId)),

  conditionsSummary: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ input }) => mountainService.conditionsSummary(input.mountainId)),

  // Bulk conditions summary for all mountains (used by the 14ers list page)
  allConditions: publicProcedure
    .query(() => mountainService.allConditionsSummary()),

  // Top N mountains by current conditions score (used by home page widget)
  topConditions: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(10).default(5) }))
    .query(({ input }) => mountainService.topConditions(input.limit)),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(80) }))
    .query(({ input }) => mountainService.search(input.query)),

  // ── Photo management (admin only) ─────────────────────────────────────────

  photos: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ input }) => {
      return prisma.mountainPhoto.findMany({
        where: { mountainId: input.mountainId },
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        select: { id: true, url: true, caption: true, isMain: true, createdAt: true },
      });
    }),

  addPhoto: adminProcedure
    .input(z.object({
      mountainId: z.string(),
      url: z.string().min(1),
      caption: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const photo = await prisma.mountainPhoto.create({
        data: { mountainId: input.mountainId, uploadedBy: ctx.user.id, url: input.url, caption: input.caption ?? null },
      });
      // Auto-promote to main if it's the first photo
      const total = await prisma.mountainPhoto.count({ where: { mountainId: input.mountainId } });
      if (total === 1) {
        await prisma.$transaction([
          prisma.mountainPhoto.update({ where: { id: photo.id }, data: { isMain: true } }),
          prisma.mountain.update({ where: { id: input.mountainId }, data: { imageUrl: input.url } }),
        ]);
        return { ...photo, isMain: true };
      }
      return photo;
    }),

  deletePhoto: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const photo = await prisma.mountainPhoto.findUnique({ where: { id: input.id } });
      if (!photo) throw new TRPCError({ code: "NOT_FOUND" });
      await prisma.mountainPhoto.delete({ where: { id: input.id } });
      if (photo.isMain) {
        const next = await prisma.mountainPhoto.findFirst({
          where: { mountainId: photo.mountainId },
          orderBy: { createdAt: "asc" },
        });
        if (next) {
          await prisma.$transaction([
            prisma.mountainPhoto.update({ where: { id: next.id }, data: { isMain: true } }),
            prisma.mountain.update({ where: { id: photo.mountainId }, data: { imageUrl: next.url } }),
          ]);
        } else {
          await prisma.mountain.update({ where: { id: photo.mountainId }, data: { imageUrl: null } });
        }
      }
      return { ok: true };
    }),

  setMainPhoto: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const photo = await prisma.mountainPhoto.findUnique({ where: { id: input.id } });
      if (!photo) throw new TRPCError({ code: "NOT_FOUND" });
      await prisma.$transaction([
        prisma.mountainPhoto.updateMany({ where: { mountainId: photo.mountainId }, data: { isMain: false } }),
        prisma.mountainPhoto.update({ where: { id: input.id }, data: { isMain: true } }),
        prisma.mountain.update({ where: { id: photo.mountainId }, data: { imageUrl: photo.url } }),
      ]);
      return { ok: true };
    }),

  alsoClimbed: publicProcedure
    .input(z.object({ mountainId: z.string(), limit: z.number().int().min(1).max(10).default(5) }))
    .query(async ({ input }) => {
      const { mountainId, limit } = input;

      const climbers = await prisma.completion.findMany({
        where: { mountainId, isPrivate: false },
        select: { userId: true },
        distinct: ["userId"],
      });

      if (climbers.length === 0) return [];

      const climberIds = climbers.map((c) => c.userId);

      const groups = await prisma.completion.groupBy({
        by: ["mountainId"],
        where: {
          userId: { in: climberIds },
          mountainId: { not: mountainId },
          isPrivate: false,
        },
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: limit,
      });

      if (groups.length === 0) return [];

      const mountains = await prisma.mountain.findMany({
        where: { id: { in: groups.map((g) => g.mountainId) } },
        select: { id: true, name: true, altitude: true, difficulty: true },
      });

      const mountainMap = new Map(mountains.map((m) => [m.id, { ...m, slug: toSlug(m.name) }]));

      return groups
        .map((g) => ({ mountain: mountainMap.get(g.mountainId)!, count: g._count.userId }))
        .filter((r) => r.mountain);
    }),

  /** Community photo gallery for a mountain — public summit photos + trip report photos */
  summitPhotos: publicProcedure
    .input(z.object({ mountainId: z.string(), limit: z.number().int().min(1).max(50).default(24) }))
    .query(async ({ input }) => {
      const [completionPhotos, reportPhotos] = await Promise.all([
        prisma.completion.findMany({
          where: { mountainId: input.mountainId, isPrivate: false, photoUrl: { not: null } },
          orderBy: { completedAt: "desc" },
          take: input.limit,
          select: {
            id: true,
            photoUrl: true,
            completedAt: true,
            notes: true,
            user: { select: { id: true, name: true, avatar: true, email: true } },
          },
        }),
        prisma.tripReport.findMany({
          where: { mountainId: input.mountainId, isPublic: true, photoUrl: { not: null } },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          select: {
            id: true,
            photoUrl: true,
            createdAt: true,
            title: true,
            user: { select: { id: true, name: true, avatar: true, email: true } },
          },
        }),
      ]);

      const combined = [
        ...completionPhotos.map((c) => ({
          id: `completion-${c.id}`,
          url: c.photoUrl!,
          date: c.completedAt,
          caption: c.notes ?? null,
          source: "summit" as const,
          user: c.user,
        })),
        ...reportPhotos.map((r) => ({
          id: `report-${r.id}`,
          url: r.photoUrl!,
          date: r.createdAt,
          caption: r.title,
          source: "report" as const,
          user: r.user,
        })),
      ];

      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return combined.slice(0, input.limit);
    }),

  /** Aggregate public trip report conditions by calendar month (1–12) for a mountain */
  conditionsByMonth: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ input }) => {
      const reports = await prisma.tripReport.findMany({
        where: { mountainId: input.mountainId, isPublic: true, conditions: { not: null } },
        select: { createdAt: true, conditions: true },
      });

      // month 1–12, score: EXCELLENT=3, GOOD=2, FAIR=1, POOR=0
      const SCORE: Record<string, number> = { EXCELLENT: 3, GOOD: 2, FAIR: 1, POOR: 0 };

      const byMonth: Record<number, { total: number; scoreSum: number; counts: Record<string, number> }> = {};
      for (let m = 1; m <= 12; m++) {
        byMonth[m] = { total: 0, scoreSum: 0, counts: { EXCELLENT: 0, GOOD: 0, FAIR: 0, POOR: 0 } };
      }

      for (const r of reports) {
        const month = new Date(r.createdAt).getMonth() + 1; // 1-12
        const cond = r.conditions!;
        byMonth[month].total += 1;
        byMonth[month].scoreSum += SCORE[cond] ?? 0;
        byMonth[month].counts[cond] = (byMonth[month].counts[cond] ?? 0) + 1;
      }

      return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const { total, scoreSum, counts } = byMonth[m];
        return {
          month: m,
          total,
          avgScore: total > 0 ? scoreSum / total : null, // null = no data
          counts,
        };
      });
    }),
});
