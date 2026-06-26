import { router } from "./trpc.js";
import { authRouter } from "./auth/auth.router.js";
import { mountainRouter } from "./mountains/mountain.router.js";

export const appRouter = router({
  auth: authRouter,
  mountain: mountainRouter,
});

export type AppRouter = typeof appRouter;
