import { TRPCError } from "@trpc/server";
import type { Difficulty, MountainRange } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const mountainService = {
  async list(filters: {
    range?: MountainRange;
    difficulty?: Difficulty;
    search?: string;
  }) {
    return prisma.mountain.findMany({
      where: {
        ...(filters.range && { range: filters.range }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
        ...(filters.search && {
          name: { contains: filters.search, mode: "insensitive" },
        }),
      },
      orderBy: { altitude: "desc" },
    });
  },

  async globalStats() {
    const [mountains, summits, saves] = await Promise.all([
      prisma.mountain.count(),
      prisma.completion.count(),
      prisma.favorite.count(),
    ]);
    return { mountains, summits, saves };
  },

  async getById(id: string) {
    const mountain = await prisma.mountain.findUnique({
      where: { id },
      include: {
        trails: { orderBy: { difficulty: "asc" } },
        _count: { select: { reviews: true, completions: true, favorites: true } },
      },
    });

    if (!mountain) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Mountain not found" });
    }

    return mountain;
  },
};
