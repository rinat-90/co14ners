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
          user: { select: { id: true, name: true, email: true, avatar: true } },
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
          user: { select: { id: true, name: true, email: true, avatar: true } },
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

  async conditionsSummary(mountainId: string) {
    const SCORES: Record<string, number> = { EXCELLENT: 4, GOOD: 3, FAIR: 2, POOR: 1 };
    const LABELS: Record<string, string> = { EXCELLENT: "Excellent", GOOD: "Good", FAIR: "Fair", POOR: "Poor" };

    const reports = await prisma.tripReport.findMany({
      where: { mountainId, isPublic: true, conditions: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { conditions: true, createdAt: true },
    });

    if (reports.length === 0) return null;

    // Weight by recency: most recent = weight 1.0, each step back -0.1 (floor 0.2)
    let totalWeight = 0;
    let weightedScore = 0;
    for (let i = 0; i < reports.length; i++) {
      const weight = Math.max(0.2, 1.0 - i * 0.1);
      const score = SCORES[reports[i].conditions!] ?? 0;
      weightedScore += score * weight;
      totalWeight += weight;
    }

    const avg = weightedScore / totalWeight;
    // Map 1–4 avg back to a label
    let label: string;
    if (avg >= 3.5) label = "Excellent";
    else if (avg >= 2.5) label = "Good";
    else if (avg >= 1.5) label = "Fair";
    else label = "Poor";

    return {
      label,
      score: Math.round(avg * 10) / 10,
      count: reports.length,
      lastUpdated: reports[0].createdAt,
    };
  },
};
