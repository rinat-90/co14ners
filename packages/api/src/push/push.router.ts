import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";
import { vapidPublicKey } from "./push.service.js";

export const pushRouter = router({
  /** Return the VAPID public key so the client can create a subscription */
  vapidKey: publicProcedure.query(() => ({ publicKey: vapidPublicKey })),

  /** Save a push subscription for the current user */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        update: { userId: ctx.user.id, p256dh: input.p256dh, auth: input.auth },
        create: {
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
        },
      });
      return { ok: true };
    }),

  /** Remove a push subscription (user opted out) */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: input.endpoint, userId: ctx.user.id },
      });
      return { ok: true };
    }),

  /** Check if the current user has any active subscriptions */
  isSubscribed: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.pushSubscription.count({ where: { userId: ctx.user.id } });
    return { subscribed: count > 0 };
  }),
});
