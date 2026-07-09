import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";
import { TRPCError } from "@trpc/server";

const userSelect = { id: true, name: true, email: true, avatar: true } as const;

export const commentRouter = router({
  list: publicProcedure
    .input(z.object({ tripReportId: z.string() }))
    .query(async ({ input }) => {
      return prisma.comment.findMany({
        where: { tripReportId: input.tripReportId },
        orderBy: { createdAt: "asc" },
        include: { user: { select: userSelect } },
      });
    }),

  add: protectedProcedure
    .input(z.object({
      tripReportId: z.string(),
      body: z.string().min(1).max(1000).trim(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the report exists and is public (or belongs to the commenter)
      const report = await prisma.tripReport.findUnique({ where: { id: input.tripReportId } });
      if (!report || (!report.isPublic && report.userId !== ctx.user.id)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }
      const comment = await prisma.comment.create({
        data: { tripReportId: input.tripReportId, userId: ctx.user.id, body: input.body },
        include: { user: { select: userSelect } },
      });
      // Notify the report author (unless they commented on their own report)
      if (report.userId !== ctx.user.id) {
        await prisma.notification.create({
          data: {
            userId: report.userId,
            actorId: ctx.user.id,
            type: "COMMENT_ON_REPORT",
            mountainId: report.mountainId,
          },
        });
      }
      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await prisma.comment.findUnique({ where: { id: input.id } });
      if (!comment || comment.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }
      await prisma.comment.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
