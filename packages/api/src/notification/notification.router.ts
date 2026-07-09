import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";

const actorSelect = { id: true, name: true, email: true, avatar: true } as const;
const mountainSelect = { id: true, name: true } as const;

export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(30) }))
    .query(async ({ ctx, input }) => {
      return prisma.notification.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        include: {
          actor: { select: actorSelect },
          mountain: { select: mountainSelect },
        },
      });
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.notification.count({
      where: { userId: ctx.user.id, read: false },
    });
    return { count };
  }),

  markRead: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notification.updateMany({
        where: { userId: ctx.user.id, id: { in: input.ids } },
        data: { read: true },
      });
      return { ok: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { userId: ctx.user.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  }),
});
