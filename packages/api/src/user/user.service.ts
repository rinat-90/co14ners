import { prisma } from "../lib/prisma.js";

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
    return prisma.completion.create({
      data: {
        userId,
        mountainId: data.mountainId,
        completedAt: new Date(data.completedAt),
        notes: data.notes,
        trailId: data.trailId,
        isPrivate: data.isPrivate,
      },
    });
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
};
