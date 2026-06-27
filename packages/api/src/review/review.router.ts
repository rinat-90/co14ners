import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { reviewService } from "./review.service.js";
import {
  addReviewSchema,
  updateReviewSchema,
  deleteReviewSchema,
  listReviewsSchema,
} from "./review.schema.js";

export const reviewRouter = router({
  list: publicProcedure
    .input(listReviewsSchema)
    .query(({ input }) => reviewService.list(input.mountainId)),

  myReview: protectedProcedure
    .input(listReviewsSchema)
    .query(({ ctx, input }) => reviewService.myReview(ctx.user.id, input.mountainId)),

  add: protectedProcedure
    .input(addReviewSchema)
    .mutation(({ ctx, input }) => reviewService.add(ctx.user.id, input)),

  update: protectedProcedure
    .input(updateReviewSchema)
    .mutation(({ ctx, input }) => reviewService.update(ctx.user.id, input.id, input)),

  delete: protectedProcedure
    .input(deleteReviewSchema)
    .mutation(({ ctx, input }) => reviewService.delete(ctx.user.id, input.id)),
});
