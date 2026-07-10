import { router } from "./trpc.js";
import { authRouter } from "./auth/auth.router.js";
import { mountainRouter } from "./mountains/mountain.router.js";
import { userRouter } from "./user/user.router.js";
import { reviewRouter } from "./review/review.router.js";
import { trailRouter } from "./trail/trail.router.js";
import { recommendationRouter } from "./recommendations/recommendation.router.js";
import { weatherRouter } from "./weather/weather.router.js";
import { feedRouter } from "./feed/feed.router.js";
import { tripReportRouter } from "./tripReport/tripReport.router.js";
import { notificationRouter } from "./notification/notification.router.js";
import { commentRouter } from "./comment/comment.router.js";
import { gearRouter } from "./gear/gear.router.js";
import { pushRouter } from "./push/push.router.js";
import { listRouter } from "./list/list.router.js";

export const appRouter = router({
  auth: authRouter,
  mountain: mountainRouter,
  user: userRouter,
  review: reviewRouter,
  trail: trailRouter,
  recommendation: recommendationRouter,
  weather: weatherRouter,
  feed: feedRouter,
  tripReport: tripReportRouter,
  notification: notificationRouter,
  comment: commentRouter,
  gear: gearRouter,
  push: pushRouter,
  list: listRouter,
});

export type AppRouter = typeof appRouter;
