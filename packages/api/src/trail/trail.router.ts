import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Difficulty } from "@prisma/client";
import { router, adminProcedure } from "../trpc.js";
import { prisma } from "../lib/prisma.js";

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
