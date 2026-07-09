import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Difficulty } from "@prisma/client";
import { router, adminProcedure, publicProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";

/** Haversine distance between two [lon, lat] points in miles */
function haversineMi([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Extract [lon, lat] pairs from GPX track points */
function parseGpxCoordinates(gpx: string): [number, number][] {
  const coords: [number, number][] = [];
  const trkptRe = /<trkpt\b([^>]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = trkptRe.exec(gpx)) !== null) {
    const attrs = m[1];
    const lon = /\blon="([^"]+)"/.exec(attrs)?.[1];
    const lat = /\blat="([^"]+)"/.exec(attrs)?.[1];
    if (lon != null && lat != null) {
      coords.push([parseFloat(lon), parseFloat(lat)]);
    }
  }
  return coords;
}

export const trailRouter = router({
  /** Public: fetch elevation profile points for a trail via Open-Meteo */
  elevationProfile: publicProcedure
    .input(z.object({ trailId: z.string() }))
    .query(async ({ input }) => {
      const trail = await prisma.trail.findUnique({
        where: { id: input.trailId },
        select: { geometry: true },
      });
      if (!trail?.geometry) return null;

      const geo = trail.geometry as { coordinates: [number, number][] };
      if (!geo.coordinates || geo.coordinates.length < 2) return null;

      // Sample up to 100 evenly-spaced points
      const coords = geo.coordinates;
      const step = Math.max(1, Math.floor(coords.length / 100));
      const sampled: [number, number][] = [];
      for (let i = 0; i < coords.length; i += step) sampled.push(coords[i]);
      if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
        sampled.push(coords[coords.length - 1]);
      }

      // Cumulative distances in miles
      const distances: number[] = [0];
      for (let i = 1; i < sampled.length; i++) {
        distances.push(distances[i - 1] + haversineMi(sampled[i - 1], sampled[i]));
      }

      // Open-Meteo elevation API (free, no key, same provider as weather)
      const lats = sampled.map(([, lat]) => lat).join(",");
      const lons = sampled.map(([lon]) => lon).join(",");
      const res = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { elevation: number[] };

      const points = sampled.map((_, i) => ({
        distanceMi: Math.round(distances[i] * 100) / 100,
        elevationFt: Math.round((data.elevation[i] ?? 0) * 3.28084),
      }));

      return { points, totalMiles: Math.round(distances[distances.length - 1] * 100) / 100 };
    }),

  /** Admin-only: create or update a trail from a GPX file */
  uploadGpx: adminProcedure
    .input(
      z.object({
        mountainId: z.string(),
        name: z.string().min(1).max(120).trim(),
        difficulty: z.nativeEnum(Difficulty),
        gpxContent: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { mountainId, name, difficulty, gpxContent } = input;

      const mountain = await prisma.mountain.findUnique({ where: { id: mountainId } });
      if (!mountain) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mountain not found" });
      }

      const coordinates = parseGpxCoordinates(gpxContent);
      if (coordinates.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "GPX file contains no valid track points",
        });
      }

      const geometry = { type: "LineString", coordinates };

      // Update existing trail with same name, or create a new one
      const existing = await prisma.trail.findFirst({ where: { mountainId, name } });
      if (existing) {
        return prisma.trail.update({
          where: { id: existing.id },
          data: { difficulty, geometry },
        });
      }

      return prisma.trail.create({
        data: { mountainId, name, difficulty, geometry },
      });
    }),

  /** Admin-only: update trail metadata */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(120).trim(),
        difficulty: z.nativeEnum(Difficulty),
        description: z.string().max(1000).nullable().optional(),
        roundTripMiles: z.number().positive().nullable().optional(),
        elevationGain: z.number().int().positive().nullable().optional(),
        estimatedHours: z.number().positive().nullable().optional(),
        trailheadElevation: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const trail = await prisma.trail.findUnique({ where: { id } });
      if (!trail) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trail not found" });
      }
      return prisma.trail.update({ where: { id }, data });
    }),

  /** Admin-only: delete a trail */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const trail = await prisma.trail.findUnique({ where: { id: input.id } });
      if (!trail) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trail not found" });
      }
      await prisma.trail.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
