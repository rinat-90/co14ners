import { TRPCError } from "@trpc/server";
import { prisma } from "../lib/prisma.js";
import { sendPushToUser } from "../push/push.service.js";
import { sendReviewEmail } from "../lib/email.js";
import { digestService } from "../ai/digest.service.js";

export const reviewService = {
  async list(mountainId: string) {
    return prisma.review.findMany({
      where: { mountainId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
  },

  async myReview(userId: string, mountainId: string) {
    return prisma.review.findUnique({
      where: { userId_mountainId: { userId, mountainId } },
    });
  },

  async add(
    userId: string,
    data: { mountainId: string; rating: number; title?: string; body: string; hikedAt?: string }
  ) {
    const existing = await prisma.review.findUnique({
      where: { userId_mountainId: { userId, mountainId: data.mountainId } },
    });
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "You have already reviewed this mountain. Edit your existing review." });
    }
    const review = await prisma.review.create({
      data: {
        userId,
        mountainId: data.mountainId,
        rating: data.rating,
        title: data.title,
        body: data.body,
        hikedAt: data.hikedAt ? new Date(data.hikedAt) : undefined,
      },
    });

    // A new review is a digest source — refresh it in the background.
    digestService.refreshInBackground(data.mountainId);

    // Notify other users who have summited this peak (exclude the reviewer)
    const summiteers = await prisma.completion.findMany({
      where: { mountainId: data.mountainId, userId: { not: userId }, isPrivate: false },
      select: { userId: true },
      distinct: ["userId"],
    });
    if (summiteers.length > 0) {
      await prisma.notification.createMany({
        data: summiteers.map((s) => ({
          userId: s.userId,
          actorId: userId,
          type: "REVIEW_ON_SUMMIT" as const,
          mountainId: data.mountainId,
        })),
        skipDuplicates: true,
      });

      // Fetch actor name and mountain name for push payload
      const [actor, mountain] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
        prisma.mountain.findUnique({ where: { id: data.mountainId }, select: { name: true } }),
      ]);
      const actorName = actor?.name ?? actor?.email.split("@")[0] ?? "Someone";
      const mountainName = mountain?.name ?? "a peak you summited";
      const mountainSlug = mountain?.name
        ? mountain.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
        : "";
      // Push + email to first 20 summiteers to avoid spam
      const capped = summiteers.slice(0, 20);
      capped.forEach((s) => {
        sendPushToUser(s.userId, {
          title: "New review on a peak you summited",
          body: `${actorName} reviewed ${mountainName}`,
          url: "/notifications",
        }).catch(() => {});
      });
      if (mountainSlug) {
        prisma.user.findMany({
          where: { id: { in: capped.map((s) => s.userId) } },
          select: { id: true, email: true },
        }).then((users) => {
          users.forEach((u) => {
            sendReviewEmail(u.email, actorName, data.rating, mountainName, mountainSlug, u.id).catch(() => {});
          });
        }).catch(() => {});
      }
    }

    return review;
  },

  async update(
    userId: string,
    id: string,
    data: { rating?: number; title?: string | null; body?: string; hikedAt?: string | null }
  ) {
    const review = await prisma.review.findFirstOrThrow({ where: { id, userId } });
    return prisma.review.update({
      where: { id: review.id },
      data: {
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.hikedAt !== undefined && { hikedAt: data.hikedAt ? new Date(data.hikedAt) : null }),
      },
    });
  },

  async delete(userId: string, id: string) {
    const review = await prisma.review.findFirstOrThrow({ where: { id, userId } });
    return prisma.review.delete({ where: { id: review.id } });
  },
};
