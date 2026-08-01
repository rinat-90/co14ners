import { z } from "zod";

/** 48 hours — longer than any 14er day, short enough to reject a broken clock. */
const MAX_HIKE_SECONDS = 48 * 60 * 60;

/**
 * One recorded GPS fix, as a tuple rather than an object: a 12-hour hike is
 * thousands of points, and `[39.1,-106.4,4102,3600]` is a third the size of the
 * equivalent `{lat,lng,alt,t}` over the wire and in the JSON column.
 *
 * `[latitude, longitude, altitudeMeters | null, secondsFromStart]`
 */
export const trackPointSchema = z.tuple([
  z.number().min(-90).max(90),
  z.number().min(-180).max(180),
  // GPS altitude is unreliable enough to come back absurd; bound it to something
  // physically possible rather than trusting the device.
  z.number().min(-500).max(9000).nullable(),
  z.number().int().min(0).max(MAX_HIKE_SECONDS),
]);

export type TrackPoint = z.infer<typeof trackPointSchema>;

export const saveTrackSchema = z.object({
  mountainId: z.string(),
  trailId: z.string().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  /** Moving time — the client subtracts paused stretches, which the server can't see. */
  durationSec: z.number().int().min(0).max(MAX_HIKE_SECONDS),
  /** Measured at full GPS resolution before thinning, so it comes from the client. */
  distanceMeters: z.number().min(0).max(300_000),
  /**
   * Upper bound is generous — at one fix per 5 m a long day can produce a lot of
   * points, and it is better to accept them and downsample than to reject the hike.
   */
  points: z.array(trackPointSchema).min(2).max(20_000),
  isPublic: z.boolean().default(true),
});

export type SaveTrackInput = z.infer<typeof saveTrackSchema>;
