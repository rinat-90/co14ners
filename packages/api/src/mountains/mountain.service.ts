import { TRPCError } from "@trpc/server";
import type { Difficulty, MountainRange } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const MOUNTAIN_INCLUDE = {
  trails: { orderBy: { difficulty: "asc" as const } },
  _count: { select: { reviews: true, completions: true, favorites: true } },
};

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
      include: MOUNTAIN_INCLUDE,
    });
    if (!mountain) throw new TRPCError({ code: "NOT_FOUND", message: "Mountain not found" });
    return mountain;
  },

  async getBySlug(slug: string) {
    const mountains = await prisma.mountain.findMany({ include: MOUNTAIN_INCLUDE });
    const mountain = mountains.find((m) => toSlug(m.name) === slug);
    if (!mountain) throw new TRPCError({ code: "NOT_FOUND", message: "Mountain not found" });
    return mountain;
  },

  async nearby(mountainId: string, radiusMiles = 20, limit = 4) {
    const origin = await prisma.mountain.findUniqueOrThrow({ where: { id: mountainId } });
    const all = await prisma.mountain.findMany({
      where: { id: { not: mountainId } },
      select: { id: true, name: true, altitude: true, difficulty: true, range: true, latitude: true, longitude: true, roundTripMiles: true, elevationGain: true },
    });

    const R = 3959; // Earth radius miles
    const toRad = (d: number) => (d * Math.PI) / 180;
    const distMiles = (lat2: number, lon2: number) => {
      const dLat = toRad(lat2 - origin.latitude);
      const dLon = toRad(lon2 - origin.longitude);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(origin.latitude)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.asin(Math.sqrt(a));
    };

    return all
      .map((m) => ({ ...m, slug: toSlug(m.name), distanceMiles: distMiles(m.latitude, m.longitude) }))
      .filter((m) => m.distanceMiles <= radiusMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, limit);
  },

  async recentConditions(mountainId: string) {
    const [completions, reviews] = await Promise.all([
      prisma.completion.findMany({
        where: { mountainId, isPrivate: false, notes: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 5,
        select: {
          id: true,
          completedAt: true,
          notes: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.review.findMany({
        where: { mountainId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          rating: true,
          body: true,
          hikedAt: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const items = [
      ...completions.map((c) => ({
        id: `c-${c.id}`,
        type: "note" as const,
        date: c.completedAt,
        text: c.notes!,
        rating: null as number | null,
        user: c.user,
      })),
      ...reviews.map((r) => ({
        id: `r-${r.id}`,
        type: "review" as const,
        date: r.hikedAt ?? r.createdAt,
        text: r.body,
        rating: r.rating,
        user: r.user,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return items;
  },
};
