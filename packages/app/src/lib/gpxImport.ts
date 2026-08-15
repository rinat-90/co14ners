/**
 * Reading hikes back out of GPX files.
 *
 * Anyone who has been climbing 14ers for a few years already has a pile of
 * recorded hikes in Gaia, Strava, CalTopo or AllTrails. All of them export GPX,
 * so one drag-and-drop should be able to backfill both the track and the summit
 * rather than asking someone to retype a decade of hiking.
 *
 * Parsing happens in the browser: the files never need to reach the server, and
 * the existing `hikeTrack.save` + `logSummit` procedures already do everything
 * that has to happen there.
 */

import type { TrackPoint } from "./track";

/** Matches `MAX_HIKE_SECONDS` in the API's `hikeTrack.schema.ts`. */
const MAX_HIKE_SECONDS = 48 * 60 * 60;

/** Matches the upper bound on `points` in `saveTrackSchema`. */
const MAX_UPLOAD_POINTS = 20_000;

/** Matches `distanceMeters` in `saveTrackSchema` — 300 km is not a hike. */
const MAX_DISTANCE_METERS = 300_000;

/** Matches the altitude bounds in `trackPointSchema`; anything outside is a bad fix. */
const MIN_ALTITUDE_METERS = -500;
const MAX_ALTITUDE_METERS = 9_000;

/**
 * The live tracker discards fixes less than this from the previous one, so an
 * imported hike is measured the same way. Without it a watch recording at 1 Hz
 * turns a lunch stop into a quarter mile of walking.
 */
const MIN_STEP_METERS = 5;

/**
 * A gap longer than this is a break, not hiking — the recorder was paused, or
 * the device lost signal in a basin. Excluded from moving time so an imported
 * hike's pace is comparable to one recorded in the app, which stops its clock
 * when the hiker pauses.
 */
const PAUSE_GAP_SECONDS = 300;

export class GpxParseError extends Error {}

export type ParsedGpx = {
  /** Track name from the file, when it has one worth showing. */
  name: string | null;
  startedAt: Date;
  endedAt: Date;
  /** Elapsed time minus long pauses, matching what the live tracker records. */
  durationSec: number;
  /** Measured across every retained fix, before thinning for upload. */
  distanceMeters: number;
  points: TrackPoint[];
  /** Fixes in the file, so the UI can say when a track was thinned. */
  rawPointCount: number;
};

// ── XML → raw fixes ───────────────────────────────────────────────────────────

export type RawFix = { lat: number; lon: number; ele: number | null; time: number };

/**
 * Every element with this local name, ignoring namespace prefixes — a few
 * exporters write `<g:trkpt>` rather than relying on a default namespace, and
 * `getElementsByTagName` matches the qualified name, so it would miss those.
 */
function byLocalName(doc: Document, localName: string): Element[] {
  return Array.from(doc.getElementsByTagName("*")).filter((el) => el.localName === localName);
}

/** Namespace-agnostic child lookup — same reason. */
function childText(parent: Element, localName: string): string | null {
  for (const child of Array.from(parent.children)) {
    if (child.localName === localName) return child.textContent?.trim() ?? null;
  }
  return null;
}

function firstText(doc: Document, parentName: string, childName: string): string | null {
  for (const parent of byLocalName(doc, parentName)) {
    const text = childText(parent, childName);
    if (text) return text;
  }
  return null;
}

function parseAltitude(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number(raw);
  // Barometric altimeters and older units write sentinels like -32768 when they
  // have nothing; clamping to null loses one point's elevation rather than
  // dragging the whole profile into the ocean.
  if (!Number.isFinite(value)) return null;
  if (value < MIN_ALTITUDE_METERS || value > MAX_ALTITUDE_METERS) return null;
  return value;
}

function extractFixes(doc: Document): RawFix[] {
  // Track points are the recorded thing. Route points (`rtept`) are a planned
  // line with no timestamps, which is why they are only a fallback for the
  // "no timestamps" error message below rather than an accepted import.
  const elements = byLocalName(doc, "trkpt");
  const source = elements.length > 0 ? elements : byLocalName(doc, "rtept");

  const fixes: RawFix[] = [];
  let missingTime = 0;

  for (const el of source) {
    const lat = Number(el.getAttribute("lat"));
    const lon = Number(el.getAttribute("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

    const timeText = childText(el, "time");
    const time = timeText === null ? NaN : Date.parse(timeText);
    if (!Number.isFinite(time)) {
      missingTime++;
      continue;
    }

    fixes.push({ lat, lon, ele: parseAltitude(childText(el, "ele")), time });
  }

  if (fixes.length === 0 && (source.length > 0 || missingTime > 0)) {
    throw new GpxParseError(
      "This file has no timestamps, so there is no hike to reconstruct from it — it looks like a planned route rather than a recorded one."
    );
  }

  // Out-of-order fixes turn up in files that were merged or edited; sorting is
  // cheaper than reasoning about negative time offsets everywhere downstream.
  fixes.sort((a, b) => a.time - b.time);
  return fixes;
}

// ── Geometry ──────────────────────────────────────────────────────────────────

/** Kept identical to `haversineMeters` in HikeTrackerInner, so distances agree. */
export function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(x));
}

/**
 * Drop fixes that did not move far enough to be a step. Always keeps the first
 * and last so the track still starts at the trailhead and ends where it ended.
 */
export function dropStationaryFixes(fixes: RawFix[]): RawFix[] {
  if (fixes.length < 3) return fixes;

  const kept: RawFix[] = [fixes[0]];
  for (let i = 1; i < fixes.length - 1; i++) {
    if (haversineMeters(kept[kept.length - 1], fixes[i]) >= MIN_STEP_METERS) kept.push(fixes[i]);
  }
  kept.push(fixes[fixes.length - 1]);
  return kept;
}

/** Elapsed time between first and last fix, minus every gap that reads as a break. */
export function movingSeconds(fixes: RawFix[]): number {
  if (fixes.length < 2) return 0;

  let moving = 0;
  for (let i = 1; i < fixes.length; i++) {
    const gap = (fixes[i].time - fixes[i - 1].time) / 1000;
    if (gap > 0 && gap <= PAUSE_GAP_SECONDS) moving += gap;
  }

  // Some devices record on movement rather than on a clock, so every gap can be
  // longer than the pause threshold. Reporting 0 for a real hike is worse than
  // reporting elapsed time that includes a rest.
  if (moving === 0) return Math.round((fixes[fixes.length - 1].time - fixes[0].time) / 1000);
  return Math.round(moving);
}

/**
 * Thin to what the API will accept. The server stores fewer still, but it
 * derives elevation gain from whatever it is given first, so handing it the
 * denser array produces a better number.
 */
export function thinFixes<T>(fixes: T[], max = MAX_UPLOAD_POINTS): T[] {
  if (fixes.length <= max) return fixes;

  const stride = (fixes.length - 1) / (max - 1);
  const thinned: T[] = [];
  for (let i = 0; i < max - 1; i++) thinned.push(fixes[Math.round(i * stride)]);
  thinned.push(fixes[fixes.length - 1]);
  return thinned;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function parseGpx(xml: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new GpxParseError("This file isn't valid XML — it may be damaged or not a GPX file.");
  }
  if (doc.documentElement?.localName !== "gpx") {
    throw new GpxParseError("This isn't a GPX file.");
  }

  const raw = extractFixes(doc);
  if (raw.length < 2) {
    throw new GpxParseError("This file has no recorded track in it.");
  }

  const fixes = dropStationaryFixes(raw);
  const start = fixes[0].time;
  const end = fixes[fixes.length - 1].time;

  if ((end - start) / 1000 > MAX_HIKE_SECONDS) {
    throw new GpxParseError(
      "This track spans more than 48 hours. Split it into single days and import them separately."
    );
  }

  let distanceMeters = 0;
  for (let i = 1; i < fixes.length; i++) distanceMeters += haversineMeters(fixes[i - 1], fixes[i]);

  // Caught here rather than left to the API, so a GPS log of a drive to the
  // trailhead gets an explanation instead of a schema error.
  if (distanceMeters > MAX_DISTANCE_METERS) {
    throw new GpxParseError(
      `This track covers ${Math.round(distanceMeters / 1000)} km, which is further than any hike — it may be a drive or a whole trip's worth of recording.`
    );
  }

  const points: TrackPoint[] = thinFixes(fixes).map((f) => [
    f.lat,
    f.lon,
    f.ele,
    Math.round((f.time - start) / 1000),
  ]);

  return {
    name: firstText(doc, "trk", "name") ?? firstText(doc, "metadata", "name"),
    startedAt: new Date(start),
    endedAt: new Date(end),
    durationSec: movingSeconds(fixes),
    distanceMeters,
    points,
    rawPointCount: raw.length,
  };
}

// ── Matching a track to a peak ────────────────────────────────────────────────

/** Close enough to the recorded summit coordinate to count as having stood on it. */
const SUMMIT_RADIUS_METERS = 150;

/**
 * A track passing this close is about that peak even if it turned around low.
 * Wide enough to catch a hike that bailed at the saddle, tight enough that a
 * drive along I-70 doesn't claim four summits.
 */
const MATCH_RADIUS_METERS = 4_000;

/** At most this many fixes are measured per peak — 58 × 20,000 is needless work. */
const MATCH_SAMPLE_LIMIT = 1_500;

export type MatchableMountain = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type GpxMatch<M extends MatchableMountain = MatchableMountain> = {
  mountain: M;
  /** Closest the track came to the summit. */
  closestMeters: number;
  reachedSummit: boolean;
};

/**
 * Peaks this track plausibly belongs to, nearest first.
 *
 * Returns candidates rather than one answer because the ambiguity is real:
 * Grays and Torreys share a saddle, and the Democrat–Cameron–Lincoln–Bross loop
 * puts four summits inside a couple of miles. The UI shows the best guess and
 * lets the hiker correct it.
 */
export function matchMountains<M extends MatchableMountain>(
  points: TrackPoint[],
  mountains: M[]
): GpxMatch<M>[] {
  if (points.length === 0) return [];

  const stride = Math.max(1, Math.ceil(points.length / MATCH_SAMPLE_LIMIT));
  const sampled: { lat: number; lon: number }[] = [];
  for (let i = 0; i < points.length; i += stride) sampled.push({ lat: points[i][0], lon: points[i][1] });

  // Whichever fix is highest is the one most likely to be standing on a summit,
  // and a stride wide enough to thin a long track can step straight over it —
  // which would turn a real summit into "came within 400 m".
  let highest = points[0];
  for (const point of points) {
    if ((point[2] ?? -Infinity) > (highest[2] ?? -Infinity)) highest = point;
  }
  sampled.push({ lat: highest[0], lon: highest[1] });

  const last = points[points.length - 1];
  sampled.push({ lat: last[0], lon: last[1] });

  const matches: GpxMatch<M>[] = [];
  for (const mountain of mountains) {
    const summit = { lat: mountain.latitude, lon: mountain.longitude };
    let closest = Infinity;
    for (const point of sampled) {
      const d = haversineMeters(summit, point);
      if (d < closest) closest = d;
    }
    if (closest <= MATCH_RADIUS_METERS) {
      matches.push({ mountain, closestMeters: closest, reachedSummit: closest <= SUMMIT_RADIUS_METERS });
    }
  }

  return matches.sort((a, b) => a.closestMeters - b.closestMeters);
}
