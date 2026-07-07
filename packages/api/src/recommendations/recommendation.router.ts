import { router, protectedProcedure } from "../trpc.js";
import { recommendationService } from "./recommendation.service.js";

export const recommendationRouter = router({
  get: protectedProcedure.query(({ ctx }) =>
    recommendationService.getRecommendations(ctx.user.id)
  ),
});
