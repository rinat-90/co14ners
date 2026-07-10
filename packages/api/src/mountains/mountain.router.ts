import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../trpc.js";
import { mountainService } from "./mountain.service.js";
import { listMountainsSchema, getMountainSchema, getMountainBySlugSchema } from "./mountain.schema.js";
import { prisma } from "../lib/prisma.js";
import { TRPCError } from "@trpc/server";

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
});
