import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { authService } from "./auth.service.js";
import {
  registerSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema.js";

export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(({ input }) => authService.register(input.email, input.password, input.name)),

  login: publicProcedure
    .input(loginSchema)
    .mutation(({ input }) => authService.login(input.email, input.password)),

  logout: publicProcedure
    .input(logoutSchema)
    .mutation(({ input }) => authService.logout(input.refreshToken)),

  refresh: publicProcedure
    .input(refreshSchema)
    .mutation(({ input }) => authService.refresh(input.refreshToken)),

  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(({ input }) => authService.forgotPassword(input.email)),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(({ input }) => authService.resetPassword(input.token, input.password)),

  me: protectedProcedure.query(({ ctx }) => authService.me(ctx.user.id)),
});
