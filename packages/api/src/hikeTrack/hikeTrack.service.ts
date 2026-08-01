import { prisma } from "../lib/prisma.js";
import type { SaveTrackInput, TrackPoint } from "./hikeTrack.schema.js";

/**
 * Points kept per track. A recorded hike can be 8,000+ fixes, but a route drawn
 * on a phone-sized map is indistinguishable past a couple of thousand — and the
 * whole array is loaded into memory every time the track is rendered.
 */
export const MAX_STORED_POINTS = 1_500;

/**
 * Only count a climb once it clears this much. Consumer GPS altitude wanders
 * while standing still, and summing every positive delta would invent thousands
 * of feet of gain over a long day.
 */
const ALTITUDE_NOISE_METERS = 8;

/**
 * Samples averaged together before the threshold runs. A threshold alone can't
 * reject oscillation wider than itself — a ±10 m sawtooth is a 20 m swing that
 * fires on every upstroke — so the noise has to be averaged down first. Odd so
 * the window is centred; small enough that a real climb keeps its shape.
 */
const SMOOTHING_WINDOW = 5;

/**
 * Centred moving average, clamping at the ends rather than shortening the window,
 * so the first and last samples aren't dragged toward the middle of the track.
 * Exact on a steady climb (the mean of a straight line is its midpoint) and it
 * flattens GPS jitter to a fraction of its amplitude.
 */
function smoothAltitudes(altitudes: number[]): number[] {
  if (altitudes.length < SMOOTHING_WINDOW) return altitudes;

  const half = Math.floor(SMOOTHING_WINDOW / 2);
  const last = altitudes.length - 1;
  return altitudes.map((_, i) => {
    let sum = 0;
    for (let offset = -half; offset <= half; offset++) {
      sum += altitudes[Math.min(last, Math.max(0, i + offset))];
    }
    return sum / SMOOTHING_WINDOW;
  });
}

/**
 * Thin a track to at most `max` points, keeping the first and last so the route
 * still starts at the trailhead and ends where the hiker stopped. Uniform stride
 * rather than Douglas–Peucker: it is O(n), and preserving the elevation profile's
 * sampling rate matters more here than minimising the point count.
 */
export function downsample(points: TrackPoint[], max = MAX_STORED_POINTS): TrackPoint[] {
  if (points.length <= max) return points;

  const stride = (points.length - 1) / (max - 1);
  const thinned: TrackPoint[] = [];
  for (let i = 0; i < max - 1; i++) thinned.push(points[Math.round(i * stride)]);
  thinned.push(points[points.length - 1]);
  return thinned;
}

/**
 * Cumulative ascent and high point in metres. Derived on the server from the
 * full-resolution points — doing it here rather than trusting the client keeps
 * the filtering consistent for every track in the table.
 *
 * Kept in sync with `cumulativeGain` in the app's `lib/track.ts`, which shows the
 * same number live during a hike; a different answer there would read as a bug.
 */
export function deriveElevation(points: TrackPoint[]): {
  gainMeters: number | null;
  maxAltitudeMeters: number | null;
} {
  const raw = points.map((p) => p[2]).filter((a): a is number => a !== null);
  if (raw.length < 2) return { gainMeters: null, maxAltitudeMeters: null };

  const altitudes = smoothAltitudes(raw);

  let gain = 0;
  // Reference point for the noise filter: only moves once the altitude has
  // changed enough to be a real climb or descent rather than GPS drift.
  let reference = altitudes[0];
  for (const altitude of altitudes) {
    const delta = altitude - reference;
    if (delta > ALTITUDE_NOISE_METERS) {
      gain += delta;
      reference = altitude;
    } else if (delta < -ALTITUDE_NOISE_METERS) {
      reference = altitude;
    }
  }

  // High point from the smoothed series too, so a single bad fix can't claim a
  // summit a few hundred feet above the one the hiker actually stood on.
  return { gainMeters: Math.round(gain), maxAltitudeMeters: Math.round(Math.max(...altitudes)) };
}

/** Fields every track list needs — deliberately without `points`, which is huge. */
const SUMMARY_SELECT = {
  id: true,
  mountainId: true,
  startedAt: true,
  endedAt: true,
  durationSec: true,
  distanceMeters: true,
  gainMeters: true,
  maxAltitudeMeters: true,
  pointCount: true,
  isPublic: true,
  completionId: true,
} as const;

export const hikeTrackService = {
  async save(userId: string, input: SaveTrackInput) {
    // A track for a mountain that doesn't exist would be unreachable in the UI.
    const mountain = await prisma.mountain.findUnique({
      where: { id: input.mountainId },
      select: { id: true },
    });
    if (!mountain) return null;

    // Derive from the full-resolution array, then store the thinned one: the
    // elevation profile is more accurate than what the stored points imply.
    const { gainMeters, maxAltitudeMeters } = deriveElevation(input.points);
    const points = downsample(input.points);

    return prisma.hikeTrack.create({
      data: {
        userId,
        mountainId: input.mountainId,
        trailId: input.trailId,
        startedAt: new Date(input.startedAt),
        endedAt: new Date(input.endedAt),
        durationSec: input.durationSec,
        distanceMeters: Math.round(input.distanceMeters),
        gainMeters,
        maxAltitudeMeters,
        points,
        pointCount: points.length,
        isPublic: input.isPublic,
      },
      select: { id: true },
    });
  },

  /** Every track the user recorded, newest first. */
  async listMine(userId: string) {
    return prisma.hikeTrack.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: {
        ...SUMMARY_SELECT,
        trail: { select: { id: true, name: true } },
        mountain: { select: { id: true, name: true, altitude: true, difficulty: true, range: true } },
      },
    });
  },

  /** Public tracks recorded on a mountain, for the community route list. */
  async listForMountain(mountainId: string, limit: number) {
    return prisma.hikeTrack.findMany({
      where: { mountainId, isPublic: true },
      orderBy: { startedAt: "desc" },
      take: limit,
      select: {
        ...SUMMARY_SELECT,
        trail: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
  },

  /**
   * One track with its points. Returns null for a private track belonging to
   * somebody else, so an unlisted track can't be read by guessing its id.
   */
  async get(id: string, viewerId: string | null) {
    const track = await prisma.hikeTrack.findUnique({
      where: { id },
      select: {
        ...SUMMARY_SELECT,
        userId: true,
        points: true,
        createdAt: true,
        trail: { select: { id: true, name: true } },
        mountain: {
          select: { id: true, name: true, altitude: true, latitude: true, longitude: true },
        },
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
    if (!track) return null;
    if (!track.isPublic && track.userId !== viewerId) return null;

    return {
      ...track,
      // Narrow the Json column to the tuple shape it actually holds. Leaving it as
      // Prisma.JsonValue makes the inferred client type recursive enough to blow
      // TypeScript's instantiation depth limit at the call site.
      points: track.points as TrackPoint[],
      isOwner: track.userId === viewerId,
    };
  },

  async remove(id: string, userId: string) {
    // deleteMany rather than delete: scoping by userId makes deleting someone
    // else's track a no-op instead of an error that confirms it exists.
    const { count } = await prisma.hikeTrack.deleteMany({ where: { id, userId } });
    return { deleted: count > 0 };
  },

  async setVisibility(id: string, userId: string, isPublic: boolean) {
    const { count } = await prisma.hikeTrack.updateMany({
      where: { id, userId },
      data: { isPublic },
    });
    return { updated: count > 0 };
  },
};
