import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";
import { TRPCError } from "@trpc/server";

const mountainSelect = {
  id: true,
  name: true,
  altitude: true,
  difficulty: true,
  range: true,
  imageUrl: true,
} as const;

export const listRouter = router({
  /** All lists for the current user */
  myLists: protectedProcedure.query(async ({ ctx }) => {
    return prisma.mountainList.findMany({
      where: { userId: ctx.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { items: true } },
        items: {
          take: 3,
          orderBy: { addedAt: "desc" },
          include: { mountain: { select: { imageUrl: true, name: true } } },
        },
      },
    });
  }),

  /** Browse all public lists — for the explore/browse page */
  explore: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(40), search: z.string().max(80).optional() }))
    .query(async ({ input }) => {
      return prisma.mountainList.findMany({
        where: {
          isPublic: true,
          ...(input.search && { name: { contains: input.search, mode: "insensitive" } }),
        },
        orderBy: { updatedAt: "desc" },
        take: input.limit,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          _count: { select: { items: true } },
          items: {
            take: 4,
            orderBy: { addedAt: "asc" },
            include: { mountain: { select: { imageUrl: true, name: true, difficulty: true } } },
          },
        },
      });
    }),

  /** Public lists by a specific user (for public profiles) */
  byUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return prisma.mountainList.findMany({
        where: { userId: input.userId, isPublic: true },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { items: true } } },
      });
    }),

  /** Get a single list with all its mountains */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const list = await prisma.mountainList.findUnique({
        where: { id: input.id },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          items: {
            orderBy: { addedAt: "asc" },
            include: { mountain: { select: mountainSelect } },
          },
        },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      const callerId = ctx.user?.id;
      if (!list.isPublic && list.userId !== callerId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }
      return list;
    }),

  /** Which list IDs contain a given mountain (for the current user) */
  listsForMountain: protectedProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ ctx, input }) => {
      const items = await prisma.mountainListItem.findMany({
        where: {
          mountainId: input.mountainId,
          list: { userId: ctx.user.id },
        },
        select: { listId: true },
      });
      return items.map((i) => i.listId);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(80).trim(),
      description: z.string().max(300).trim().optional(),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.mountainList.create({
        data: { userId: ctx.user.id, ...input },
        include: { _count: { select: { items: true } } },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(80).trim().optional(),
      description: z.string().max(300).trim().nullable().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const list = await prisma.mountainList.findUnique({ where: { id: input.id } });
      if (!list || list.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, ...data } = input;
      return prisma.mountainList.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await prisma.mountainList.findUnique({ where: { id: input.id } });
      if (!list || list.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await prisma.mountainList.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  addMountain: protectedProcedure
    .input(z.object({ listId: z.string(), mountainId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await prisma.mountainList.findUnique({ where: { id: input.listId } });
      if (!list || list.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await prisma.mountainListItem.upsert({
        where: { listId_mountainId: { listId: input.listId, mountainId: input.mountainId } },
        create: { listId: input.listId, mountainId: input.mountainId },
        update: {},
      });
      await prisma.mountainList.update({ where: { id: input.listId }, data: { updatedAt: new Date() } });
      return { ok: true };
    }),

  removeMountain: protectedProcedure
    .input(z.object({ listId: z.string(), mountainId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await prisma.mountainList.findUnique({ where: { id: input.listId } });
      if (!list || list.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await prisma.mountainListItem.deleteMany({
        where: { listId: input.listId, mountainId: input.mountainId },
      });
      return { ok: true };
    }),
});
