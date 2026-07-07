import { router } from "./trpc.js";
import { authRouter } from "./auth/auth.router.js";
import { mountainRouter } from "./mountains/mountain.router.js";
import { userRouter } from "./user/user.router.js";
import { reviewRouter } from "./review/review.router.js";
import { trailRouter } from "./trail/trail.router.js";
import { recommendationRouter } from "./recommendations/recommendation.router.js";
import { weatherRouter } from "./weather/weather.router.js";

export const appRouter = router({
  auth: authRouter,
  mountain: mountainRouter,
  user: userRouter,
  review: reviewRouter,
  trail: trailRouter,
  recommendation: recommendationRouter,
  weather: weatherRouter,
});

export type AppRouter = typeof appRouter;
