/**
 * Fetches trail geometry from the OpenStreetMap Overpass API and stores it
 * as GeoJSON LineString in the Trail.geometry field.
 *
 * Usage:
 *   cd packages/api
 *   bun run src/scripts/fetch-trail-geometry.ts
 *
 * Overpass API is free and requires no API key. Rate-limited to ~1 req/2s here.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Types ──────────────────────────────────────────────────────────────────────

interface OverpassNode {
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: OverpassNode[];
}

interface OverpassRelationMember {
  type: string;
  ref: number;
  role: string;
  geometry?: OverpassNode[];
}

interface OverpassRelation {
  type: "relation";
  id: number;
  tags?: Record<string, string>;
  members?: OverpassRelationMember[];
}

interface OverpassResponse {
  elements: (OverpassWay | OverpassRelation)[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Haversine distance in km between two lat/lon points */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Remove coordinate points that are more than maxKm from the summit */
function pruneByDistance(
  coords: [number, number][],
  summitLat: number,
  summitLon: number,
  maxKm = 12,
): [number, number][] {
  return coords.filter(([lon, lat]) => distanceKm(summitLat, summitLon, lat, lon) <= maxKm);
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

async function queryOverpass(query: string): Promise<OverpassResponse> {
  const compact = query.replace(/\s+/g, " ").trim();
  let lastErr: Error | null = null;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      // POST with raw body — most compatible with all Overpass mirrors
      const res = await fetch(mirror, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "co14ners-trail-fetcher/1.0",
        },
        body: `data=${encodeURIComponent(compact)}`,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<OverpassResponse>;
    } catch (e) {
      lastErr = e as Error;
      await sleep(1500);
    }
  }
  throw lastErr ?? new Error("All Overpass mirrors failed");
}

/** Simple word-overlap similarity, 0–1 */
function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const wa = new Set(na.split(/\s+/).filter(Boolean));
  const wb = new Set(nb.split(/\s+/).filter(Boolean));
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / Math.max(wa.size, wb.size, 1);
}

/** Extract [lon, lat] coordinate pairs from a relation's member ways */
function relationToCoords(rel: OverpassRelation): [number, number][] {
  const coords: [number, number][] = [];
  for (const m of rel.members ?? []) {
    if (m.type === "way" && m.geometry) {
      for (const n of m.geometry) coords.push([n.lon, n.lat]);
    }
  }
  return coords;
}

/** Extract [lon, lat] coordinate pairs from a way's geometry */
function wayToCoords(way: OverpassWay): [number, number][] {
  return (way.geometry ?? []).map((n) => [n.lon, n.lat]);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const mountains = await prisma.mountain.findMany({
    include: { trails: true },
    orderBy: { altitude: "desc" },
  });

  console.log(`\nFetching trail geometry for ${mountains.length} mountains...\n`);

  let totalSaved = 0;
  let totalMissed = 0;

  for (const mountain of mountains) {
    if (mountain.trails.length === 0) {
      console.log(`⏭  ${mountain.name}: no trails`);
      continue;
    }

    const { latitude: lat, longitude: lon } = mountain;

    // Query hiking route relations AND named paths near the summit
    const query = `
[out:json][timeout:30];
(
  relation["type"="route"]["route"="hiking"](around:7000,${lat},${lon});
  way["highway"~"path|track"]["name"](around:4000,${lat},${lon});
);
out geom;
`;

    let data: OverpassResponse;
    try {
      data = await queryOverpass(query);
    } catch (err) {
      console.error(`  ✗ Overpass error for ${mountain.name}:`, err);
      await sleep(5000);
      continue;
    }

    const relations = data.elements.filter((e) => e.type === "relation") as OverpassRelation[];
    const ways = data.elements.filter((e) => e.type === "way") as OverpassWay[];

    console.log(`${mountain.name}  (${relations.length} relations, ${ways.length} named ways)`);

    for (const trail of mountain.trails) {
      let coords: [number, number][] | null = null;
      let matchSource = "";

      // 1. Best-match relation by name
      let bestScore = 0;
      let bestRel: OverpassRelation | null = null;
      for (const rel of relations) {
        const relName = rel.tags?.name ?? rel.tags?.["name:en"] ?? "";
        if (!relName) continue;
        const score = nameSimilarity(trail.name, relName);
        if (score > bestScore) { bestScore = score; bestRel = rel; }
      }
      if (bestRel && bestScore >= 0.25) {
        const c = relationToCoords(bestRel);
        if (c.length > 1) {
          coords = c;
          matchSource = `relation "${bestRel.tags?.name}" (score ${bestScore.toFixed(2)})`;
        }
      }

      // 2. Best-match way by name
      if (!coords) {
        let bestWayScore = 0;
        let bestWay: OverpassWay | null = null;
        for (const way of ways) {
          const wayName = way.tags?.name ?? "";
          if (!wayName) continue;
          const score = nameSimilarity(trail.name, wayName);
          if (score > bestWayScore) { bestWayScore = score; bestWay = way; }
        }
        if (bestWay && bestWayScore >= 0.2) {
          const c = wayToCoords(bestWay);
          if (c.length > 1) {
            coords = c;
            matchSource = `way "${bestWay.tags?.name}" (score ${bestWayScore.toFixed(2)})`;
          }
        }
      }

      // 3. Fallback: relation with most geometry (main route)
      if (!coords && relations.length > 0) {
        const ranked = relations
          .map((r) => ({ rel: r, len: relationToCoords(r).length }))
          .sort((a, b) => b.len - a.len);
        if (ranked[0] && ranked[0].len > 1) {
          coords = relationToCoords(ranked[0].rel);
          matchSource = `fallback relation "${ranked[0].rel.tags?.name}"`;
        }
      }

      // 4. Fallback: longest named way
      if (!coords && ways.length > 0) {
        const ranked = ways
          .map((w) => ({ way: w, len: wayToCoords(w).length }))
          .sort((a, b) => b.len - a.len);
        if (ranked[0] && ranked[0].len > 1) {
          coords = wayToCoords(ranked[0].way);
          matchSource = `fallback way "${ranked[0].way.tags?.name}"`;
        }
      }

      if (coords && coords.length > 1) {
        const { latitude: sLat, longitude: sLon } = mountain;
        const pruned = pruneByDistance(coords, sLat, sLon);
        if (pruned.length < 2) {
          console.log(`  ✗ ${trail.name}: geometry too far from summit (all points > 12 km)`);
          totalMissed++;
          continue;
        }
        await prisma.trail.update({
          where: { id: trail.id },
          data: { geometry: { type: "LineString", coordinates: pruned } },
        });
        const dropped = coords.length - pruned.length;
        const dropNote = dropped > 0 ? ` (dropped ${dropped} distant pts)` : "";
        console.log(`  ✓ ${trail.name} → ${matchSource} (${pruned.length} pts${dropNote})`);
        totalSaved++;
      } else {
        console.log(`  ✗ ${trail.name}: no geometry found`);
        totalMissed++;
      }
    }

    // Polite rate-limit: 2 s between mountains
    await sleep(2000);
  }

  console.log(`\nDone. Saved: ${totalSaved}  |  Missed: ${totalMissed}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
