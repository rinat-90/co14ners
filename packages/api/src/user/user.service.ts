import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import type { AchievementType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

// Mount Elbert is the highest Colorado 14er at 14,440 ft
const ELBERT_NAME = "Mount Elbert";

export const userService = {
  async getProfile(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, avatar: true, bio: true, createdAt: true },
    });
  },

  async getStats(userId: string) {
    const [completions, savedCount] = await Promise.all([
      prisma.completion.findMany({
        where: { userId },
        include: {
          mountain: { select: { altitude: true, range: true, elevationGain: true } },
        },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    const uniqueMountains = new Set(completions.map((c) => c.mountainId)).size;
    const totalElevationGained = completions.reduce(
      (sum, c) => sum + (c.mountain.elevationGain ?? 0),
      0
    );
    const rangesCovered = new Set(completions.map((c) => c.mountain.range)).size;
    const highestPeak = completions.reduce((max, c) => Math.max(max, c.mountain.altitude), 0);

    return {
      totalSummits: completions.length,
      uniqueMountains,
      totalElevationGained,
      rangesCovered,
      highestPeak,
      savedMountains: savedCount,
    };
  },

  async getCompletions(userId: string) {
    return prisma.completion.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      include: {
        mountain: { select: { id: true, name: true, altitude: true, difficulty: true, range: true } },
        trail: { select: { id: true, name: true } },
      },
    });
  },

  async getFavorites(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        mountain: {
          select: {
            id: true,
            name: true,
            altitude: true,
            difficulty: true,
            range: true,
            elevationGain: true,
            roundTripMiles: true,
          },
        },
      },
    });
  },

  async logSummit(
    userId: string,
    data: { mountainId: string; completedAt: string; notes?: string; trailId?: string; isPrivate: boolean }
  ) {
    const completion = await prisma.completion.create({
      data: {
        userId,
        mountainId: data.mountainId,
        completedAt: new Date(data.completedAt),
        notes: data.notes,
        trailId: data.trailId,
        isPrivate: data.isPrivate,
      },
    });
    const newAchievements = await userService.checkAndUnlockAchievements(userId);
    return { completion, newAchievements };
  },

  async checkAndUnlockAchievements(userId: string) {
    const [completions, existing] = await Promise.all([
      prisma.completion.findMany({
        where: { userId },
        include: {
          mountain: { select: { name: true, difficulty: true, range: true, altitude: true } },
        },
      }),
      prisma.userAchievement.findMany({ where: { userId }, select: { type: true } }),
    ]);

    const earned = new Set(existing.map((a) => a.type));
    const uniqueMountainIds = new Set(completions.map((c) => c.mountainId));
    const toUnlock: AchievementType[] = [];

    const check = (type: AchievementType, condition: boolean) => {
      if (condition && !earned.has(type)) toUnlock.push(type);
    };

    check("FIRST_SUMMIT", uniqueMountainIds.size >= 1);
    check("TEN_SUMMITS", uniqueMountainIds.size >= 10);
    check("TWENTY_FIVE_SUMMITS", uniqueMountainIds.size >= 25);
    check("ALL_58", uniqueMountainIds.size >= 58);

    const rangeCompletions = (range: string) =>
      new Set(completions.filter((c) => c.mountain.range === range).map((c) => c.mountainId)).size;

    // Get range totals from the mountain table
    const rangeCounts = await prisma.mountain.groupBy({
      by: ["range"],
      _count: { _all: true },
    });
    const rangeTotal = (range: string) =>
      rangeCounts.find((r) => r.range === range)?._count._all ?? 0;

    check("SAWATCH_COMPLETE", rangeCompletions("SAWATCH") >= rangeTotal("SAWATCH") && rangeTotal("SAWATCH") > 0);
    check("ELK_COMPLETE", rangeCompletions("ELK") >= rangeTotal("ELK") && rangeTotal("ELK") > 0);
    check("SAN_JUAN_COMPLETE", rangeCompletions("SAN_JUAN") >= rangeTotal("SAN_JUAN") && rangeTotal("SAN_JUAN") > 0);
    check("SANGRE_DE_CRISTO_COMPLETE", rangeCompletions("SANGRE_DE_CRISTO") >= rangeTotal("SANGRE_DE_CRISTO") && rangeTotal("SANGRE_DE_CRISTO") > 0);
    check("FRONT_COMPLETE", rangeCompletions("FRONT") >= rangeTotal("FRONT") && rangeTotal("FRONT") > 0);
    check("TENMILE_MOSQUITO_COMPLETE", rangeCompletions("TENMILE_MOSQUITO") >= rangeTotal("TENMILE_MOSQUITO") && rangeTotal("TENMILE_MOSQUITO") > 0);

    check("CLASS_4_CLIMBER", completions.some((c) => c.mountain.difficulty === "CLASS_4" || c.mountain.difficulty === "CLASS_5"));
    check("CLASS_5_CLIMBER", completions.some((c) => c.mountain.difficulty === "CLASS_5"));
    check("HIGHEST_PEAK", completions.some((c) => c.mountain.name === ELBERT_NAME));

    if (toUnlock.length === 0) return [];

    await prisma.userAchievement.createMany({
      data: toUnlock.map((type) => ({ userId, type })),
      skipDuplicates: true,
    });

    return toUnlock;
  },

  async getAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
    });
  },

  async getPublicProfile(userId: string) {
    const [user, completions, achievements] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.completion.findMany({
        where: { userId, isPrivate: false },
        orderBy: { completedAt: "desc" },
        include: {
          mountain: { select: { id: true, name: true, altitude: true, difficulty: true, range: true } },
          trail: { select: { name: true } },
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: "asc" },
      }),
    ]);

    const uniqueMountainIds = new Set(completions.map((c) => c.mountainId));
    const totalElevationGained = completions.reduce((sum, c) => sum + (c.mountain.altitude ?? 0), 0);
    const highestPeak = completions.reduce((max, c) => Math.max(max, c.mountain.altitude), 0);
    const rangesCovered = new Set(completions.map((c) => c.mountain.range)).size;

    return {
      user,
      stats: {
        totalSummits: completions.length,
        uniqueMountains: uniqueMountainIds.size,
        totalElevationGained,
        highestPeak,
        rangesCovered,
      },
      recentCompletions: completions.slice(0, 20),
      achievements,
    };
  },

  async updateCompletion(
    userId: string,
    id: string,
    data: { completedAt?: string; notes?: string | null; isPrivate?: boolean }
  ) {
    const completion = await prisma.completion.findFirstOrThrow({ where: { id, userId } });
    return prisma.completion.update({
      where: { id: completion.id },
      data: {
        ...(data.completedAt && { completedAt: new Date(data.completedAt) }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
      },
    });
  },

  async deleteCompletion(userId: string, id: string) {
    const completion = await prisma.completion.findFirstOrThrow({ where: { id, userId } });
    return prisma.completion.delete({ where: { id: completion.id } });
  },

  async addFavorite(userId: string, mountainId: string) {
    return prisma.favorite.upsert({
      where: { userId_mountainId: { userId, mountainId } },
      create: { userId, mountainId },
      update: {},
    });
  },

  async removeFavorite(userId: string, mountainId: string) {
    return prisma.favorite.deleteMany({ where: { userId, mountainId } });
  },

  async isFavorite(userId: string, mountainId: string) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_mountainId: { userId, mountainId } },
    });
    return { isFavorite: !!fav };
  },

  async myCompletion(userId: string, mountainId: string) {
    return prisma.completion.findFirst({
      where: { userId, mountainId },
      orderBy: { completedAt: "desc" },
    });
  },

  async updateEmail(userId: string, newEmail: string, currentPassword: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password" });

    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });

    return prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
  },

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect current password" });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  },
};
