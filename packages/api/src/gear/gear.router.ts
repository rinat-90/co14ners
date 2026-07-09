import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";

export const gearRouter = router({
  getChecklist: protectedProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await prisma.gearChecklist.findUnique({
        where: { userId_mountainId: { userId: ctx.user.id, mountainId: input.mountainId } },
      });
      return { checked: (row?.checked as string[]) ?? [] };
    }),

  saveChecklist: protectedProcedure
    .input(z.object({ mountainId: z.string(), checked: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.gearChecklist.upsert({
        where: { userId_mountainId: { userId: ctx.user.id, mountainId: input.mountainId } },
        update: { checked: input.checked },
        create: { userId: ctx.user.id, mountainId: input.mountainId, checked: input.checked },
      });
      return { ok: true };
    }),
});
