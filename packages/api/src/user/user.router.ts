import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import { userService } from "./user.service.js";
import { prisma } from "../lib/prisma.js";
import {
  logSummitSchema,
  updateCompletionSchema,
  deleteCompletionSchema,
  favoriteSchema,
  updateEmailSchema,
  updatePasswordSchema,
} from "./user.schema.js";

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => userService.getProfile(ctx.user.id)),

  stats: protectedProcedure.query(({ ctx }) => userService.getStats(ctx.user.id)),

  completions: protectedProcedure.query(({ ctx }) => userService.getCompletions(ctx.user.id)),

  favorites: protectedProcedure.query(({ ctx }) => userService.getFavorites(ctx.user.id)),

  logSummit: protectedProcedure
    .input(logSummitSchema)
    .mutation(({ ctx, input }) => userService.logSummit(ctx.user.id, input)),

  updateCompletion: protectedProcedure
    .input(updateCompletionSchema)
    .mutation(({ ctx, input }) => userService.updateCompletion(ctx.user.id, input.id, input)),

  deleteCompletion: protectedProcedure
    .input(deleteCompletionSchema)
    .mutation(({ ctx, input }) => userService.deleteCompletion(ctx.user.id, input.id)),

  addFavorite: protectedProcedure
    .input(favoriteSchema)
    .mutation(({ ctx, input }) => userService.addFavorite(ctx.user.id, input.mountainId)),

  removeFavorite: protectedProcedure
    .input(favoriteSchema)
    .mutation(({ ctx, input }) => userService.removeFavorite(ctx.user.id, input.mountainId)),

  isFavorite: protectedProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ ctx, input }) => userService.isFavorite(ctx.user.id, input.mountainId)),

  myCompletion: protectedProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ ctx, input }) => userService.myCompletion(ctx.user.id, input.mountainId)),

  updateEmail: protectedProcedure
    .input(updateEmailSchema)
    .mutation(({ ctx, input }) => userService.updateEmail(ctx.user.id, input.newEmail, input.currentPassword)),

  updatePassword: protectedProcedure
    .input(updatePasswordSchema)
    .mutation(({ ctx, input }) => userService.updatePassword(ctx.user.id, input.currentPassword, input.newPassword)),

  achievements: protectedProcedure.query(({ ctx }) => userService.getAchievements(ctx.user.id)),

  publicProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => userService.getPublicProfile(input.userId)),

  follow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) throw new Error("Cannot follow yourself");
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: ctx.user.id, followingId: input.userId } },
        create: { followerId: ctx.user.id, followingId: input.userId },
        update: {},
      });
      return { ok: true };
    }),

  unfollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.follow.deleteMany({
        where: { followerId: ctx.user.id, followingId: input.userId },
      });
      return { ok: true };
    }),

  isFollowing: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: ctx.user.id, followingId: input.userId } },
      });
      return { isFollowing: !!follow };
    }),

  followCounts: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [followers, following] = await Promise.all([
        prisma.follow.count({ where: { followingId: input.userId } }),
        prisma.follow.count({ where: { followerId: input.userId } }),
      ]);
      return { followers, following };
    }),
});
