import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";
import { TRPCError } from "@trpc/server";

const createSchema = z.object({
  mountainId: z.string(),
  trailId: z.string().optional(),
  title: z.string().min(3).max(120),
  body: z.string().min(10).max(5000),
  conditions: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
});

const userSelect = { id: true, name: true, email: true } as const;
const mountainSelect = { id: true, name: true, altitude: true, difficulty: true } as const;
const trailSelect = { id: true, name: true } as const;

export const tripReportRouter = router({
  // List public reports for a mountain (newest first)
  list: publicProcedure
    .input(z.object({ mountainId: z.string(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      return prisma.tripReport.findMany({
        where: { mountainId: input.mountainId, isPublic: true },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          user: { select: userSelect },
          trail: { select: trailSelect },
        },
      });
    }),

  // List the current user's own reports
  myReports: protectedProcedure.query(async ({ ctx }) => {
    return prisma.tripReport.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        mountain: { select: mountainSelect },
        trail: { select: trailSelect },
      },
    });
  }),

  // Create a new trip report
  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      return prisma.tripReport.create({
        data: {
          userId: ctx.user.id,
          mountainId: input.mountainId,
          trailId: input.trailId ?? null,
          title: input.title,
          body: input.body,
          conditions: input.conditions ?? null,
          photoUrl: input.photoUrl || null,
          isPublic: input.isPublic,
        },
        include: {
          user: { select: userSelect },
          trail: { select: trailSelect },
        },
      });
    }),

  // Update own report
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(3).max(120).optional(),
        body: z.string().min(10).max(5000).optional(),
        conditions: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).nullable().optional(),
        photoUrl: z.string().url().optional().or(z.literal("")).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const report = await prisma.tripReport.findUnique({ where: { id: input.id } });
      if (!report || report.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }
      const { id, ...data } = input;
      return prisma.tripReport.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.body !== undefined && { body: data.body }),
          ...(data.conditions !== undefined && { conditions: data.conditions }),
          ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl || null }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        },
        include: {
          user: { select: userSelect },
          trail: { select: trailSelect },
        },
      });
    }),

  // Delete own report
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await prisma.tripReport.findUnique({ where: { id: input.id } });
      if (!report || report.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }
      await prisma.tripReport.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  // Public reports by a specific user (for public profile page)
  byUser: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      return prisma.tripReport.findMany({
        where: { userId: input.userId, isPublic: true },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          mountain: { select: { id: true, name: true, altitude: true, difficulty: true } },
          trail: { select: { name: true } },
        },
      });
    }),

  // Recent reports for the feed
  recent: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      return prisma.tripReport.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          user: { select: userSelect },
          mountain: { select: mountainSelect },
          trail: { select: trailSelect },
        },
      });
    }),
});
