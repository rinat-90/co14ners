import { prisma } from "../lib/prisma.js";
import type { Difficulty, MountainRange } from "@prisma/client";

const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  CLASS_1: 1,
  CLASS_2: 2,
  CLASS_3: 3,
  CLASS_4: 4,
  CLASS_5: 5,
};

const RANGE_LABELS: Record<MountainRange, string> = {
  SAWATCH: "Sawatch",
  ELK: "Elk",
  SAN_JUAN: "San Juan",
  TENMILE_MOSQUITO: "Tenmile/Mosquito",
  FRONT: "Front",
  SANGRE_DE_CRISTO: "Sangre de Cristo",
  OTHER: "other",
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const recommendationService = {
  async getRecommendations(userId: string) {
    const [completions, allMountains] = await Promise.all([
      prisma.completion.findMany({
        where: { userId },
        include: {
          mountain: { select: { id: true, difficulty: true, range: true, altitude: true } },
        },
      }),
      prisma.mountain.findMany({
        select: {
          id: true,
          name: true,
          altitude: true,
          difficulty: true,
          range: true,
          elevationGain: true,
          roundTripMiles: true,
          estimatedHours: true,
          _count: { select: { completions: true } },
        },
      }),
    ]);

    const completedIds = new Set(completions.map((c) => c.mountainId));
    const uncompleted = allMountains.filter((m) => !completedIds.has(m.id));

    if (uncompleted.length === 0) return [];

    // Build user difficulty profile
    const userDifficulties = completions.map((c) => DIFFICULTY_ORDER[c.mountain.difficulty]);
    const avgDifficulty =
      userDifficulties.length > 0
        ? userDifficulties.reduce((a, b) => a + b, 0) / userDifficulties.length
        : 1;
    const highestPeak = completions.reduce((max, c) => Math.max(max, c.mountain.altitude), 0);

    // Count completions per range
    const rangeCount: Partial<Record<MountainRange, number>> = {};
    for (const c of completions) {
      rangeCount[c.mountain.range] = (rangeCount[c.mountain.range] ?? 0) + 1;
    }

    const maxPopularity = Math.max(...allMountains.map((m) => m._count.completions), 1);

    const scored = uncompleted.map((m) => {
      let score = 0;
      let reason = "";

      const mDiff = DIFFICULTY_ORDER[m.difficulty];
      const targetDiff = Math.min(5, Math.ceil(avgDifficulty + 0.3));

      // Difficulty proximity (0–30 pts)
      const diffDelta = Math.abs(mDiff - targetDiff);
      score += Math.max(0, 30 - diffDelta * 12);

      // Range affinity (0–25 pts)
      const userInRange = rangeCount[m.range] ?? 0;
      const uncompletedInRange = uncompleted.filter((a) => a.range === m.range).length;

      if (userInRange >= 2 && uncompletedInRange <= 3) {
        score += 25;
        reason = `Finish the ${RANGE_LABELS[m.range]} range`;
      } else if (userInRange >= 1) {
        score += 15;
        reason = `Continue in the ${RANGE_LABELS[m.range]} range`;
      }

      // Popularity (0–20 pts)
      score += (m._count.completions / maxPopularity) * 20;

      // Altitude curiosity: just above user's highest (0–10 pts)
      if (highestPeak > 0 && m.altitude > highestPeak && m.altitude < highestPeak + 400) {
        score += 10;
      }

      // Assign reason if not yet set
      if (!reason) {
        if (completions.length === 0) {
          reason = "Great starter peak";
        } else if (mDiff === targetDiff + 1) {
          reason = "Next step up";
        } else if (mDiff === targetDiff) {
          reason = "Matches your level";
        } else if (m._count.completions >= maxPopularity * 0.7) {
          reason = "Popular peak";
        } else {
          reason = "Explore more";
        }
      }

      return {
        id: m.id,
        name: m.name,
        slug: toSlug(m.name),
        altitude: m.altitude,
        difficulty: m.difficulty,
        range: m.range,
        elevationGain: m.elevationGain,
        roundTripMiles: m.roundTripMiles,
        estimatedHours: m.estimatedHours,
        reason,
        _score: score,
      };
    });

    return scored
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score: _, ...rest }) => rest);
  },
};
