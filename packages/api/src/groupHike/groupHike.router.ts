import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";
import { TRPCError } from "@trpc/server";
import { sendPushToUser } from "../push/push.service.js";

const userSelect = { id: true, name: true, email: true, avatar: true } as const;

const groupHikeSelect = {
  id: true,
  title: true,
  description: true,
  hikeDate: true,
  maxAttendees: true,
  createdAt: true,
  organizer: { select: userSelect },
  mountain: { select: { id: true, name: true, altitude: true, difficulty: true } },
  rsvps: {
    select: {
      id: true,
      status: true,
      userId: true,
      user: { select: userSelect },
    },
  },
} as const;

export const groupHikeRouter = router({
  /** Upcoming group hikes for a mountain (next 90 days) */
  forMountain: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ input }) => {
      const now = new Date();
      const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      return prisma.groupHike.findMany({
        where: {
          mountainId: input.mountainId,
          hikeDate: { gte: now, lte: cutoff },
        },
        orderBy: { hikeDate: "asc" },
        select: groupHikeSelect,
      });
    }),

  /** Create a new group hike event */
  create: protectedProcedure
    .input(z.object({
      mountainId: z.string(),
      title: z.string().min(3).max(120),
      description: z.string().max(500).optional(),
      hikeDate: z.string().datetime(),
      maxAttendees: z.number().int().min(2).max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const hikeDate = new Date(input.hikeDate);
      if (hikeDate <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Hike date must be in the future" });
      }
      return prisma.groupHike.create({
        data: {
          organizerId: ctx.user.id,
          mountainId: input.mountainId,
          title: input.title,
          description: input.description,
          hikeDate,
          maxAttendees: input.maxAttendees,
        },
        select: groupHikeSelect,
      });
    }),

  /** Cancel (delete) your own group hike */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hike = await prisma.groupHike.findUnique({ where: { id: input.id } });
      if (!hike || hike.organizerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await prisma.groupHike.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /** RSVP to a group hike (or update existing RSVP) */
  rsvp: protectedProcedure
    .input(z.object({
      groupHikeId: z.string(),
      status: z.enum(["GOING", "MAYBE"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const hike = await prisma.groupHike.findUnique({
        where: { id: input.groupHikeId },
        select: { organizerId: true, title: true, mountain: { select: { name: true } }, maxAttendees: true, hikeDate: true },
      });
      if (!hike) throw new TRPCError({ code: "NOT_FOUND" });
      if (hike.hikeDate <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "This hike has already passed" });

      // Check capacity
      if (hike.maxAttendees) {
        const goingCount = await prisma.groupHikeRsvp.count({
          where: { groupHikeId: input.groupHikeId, status: "GOING" },
        });
        if (input.status === "GOING" && goingCount >= hike.maxAttendees) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This hike is at capacity" });
        }
      }

      const rsvp = await prisma.groupHikeRsvp.upsert({
        where: { groupHikeId_userId: { groupHikeId: input.groupHikeId, userId: ctx.user.id } },
        create: { groupHikeId: input.groupHikeId, userId: ctx.user.id, status: input.status },
        update: { status: input.status },
      });

      // Notify organizer (unless they RSVPed to their own hike)
      if (hike.organizerId !== ctx.user.id) {
        await prisma.notification.create({
          data: {
            userId: hike.organizerId,
            actorId: ctx.user.id,
            type: "GROUP_HIKE_RSVP",
          },
        }).catch(() => {});
        const actor = await prisma.user.findUnique({ where: { id: ctx.user.id }, select: { name: true, email: true } });
        const actorName = actor?.name ?? actor?.email.split("@")[0] ?? "Someone";
        sendPushToUser(hike.organizerId, {
          title: `New RSVP for "${hike.title}"`,
          body: `${actorName} is ${input.status === "GOING" ? "going" : "maybe going"} to your hike on ${hike.mountain.name}`,
          url: "/notifications",
        }).catch(() => {});
      }

      return rsvp;
    }),

  /** Remove your RSVP from a group hike */
  removeRsvp: protectedProcedure
    .input(z.object({ groupHikeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.groupHikeRsvp.deleteMany({
        where: { groupHikeId: input.groupHikeId, userId: ctx.user.id },
      });
      return { ok: true };
    }),

  /** Current user's RSVP for a specific hike */
  myRsvp: protectedProcedure
    .input(z.object({ groupHikeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.groupHikeRsvp.findUnique({
        where: { groupHikeId_userId: { groupHikeId: input.groupHikeId, userId: ctx.user.id } },
      });
    }),

  /** Hikes I organized + hikes I RSVPed to (upcoming only) */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const [organized, rsvped] = await Promise.all([
      prisma.groupHike.findMany({
        where: { organizerId: ctx.user.id, hikeDate: { gte: now } },
        orderBy: { hikeDate: "asc" },
        select: groupHikeSelect,
      }),
      prisma.groupHikeRsvp.findMany({
        where: { userId: ctx.user.id, groupHike: { hikeDate: { gte: now } } },
        orderBy: { groupHike: { hikeDate: "asc" } },
        include: { groupHike: { select: groupHikeSelect } },
      }),
    ]);
    return {
      organized,
      rsvped: rsvped
        .filter((r) => r.groupHike.organizer.id !== ctx.user.id)
        .map((r) => ({ ...r.groupHike, myStatus: r.status })),
    };
  }),
});
