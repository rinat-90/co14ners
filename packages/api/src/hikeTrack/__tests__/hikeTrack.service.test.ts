import { describe, it, expect } from "bun:test";
import { downsample, deriveElevation, MAX_STORED_POINTS } from "../hikeTrack.service.js";
import type { TrackPoint } from "../hikeTrack.schema.js";

/** A track climbing `metersPerStep` per fix, one fix per second. */
function climb(count: number, metersPerStep: number, from = 3000): TrackPoint[] {
  return Array.from({ length: count }, (_, i) => [39, -106, from + i * metersPerStep, i]);
}

/** Standing still while GPS altitude swings +/-`amplitude` between fixes. */
function stationaryNoise(count: number, amplitude: number): TrackPoint[] {
  return Array.from({ length: count }, (_, i) => [
    39,
    -106,
    3000 + (i % 2 ? amplitude : -amplitude),
    i,
  ]);
}

describe("downsample", () => {
  it("leaves a track under the cap untouched", () => {
    const points = climb(100, 1);
    expect(downsample(points)).toBe(points);
  });

  it("leaves a track exactly at the cap untouched", () => {
    expect(downsample(climb(MAX_STORED_POINTS, 1))).toHaveLength(MAX_STORED_POINTS);
  });

  it("thins a long track to the cap, keeping both ends", () => {
    const points = climb(8000, 0.5);
    const thinned = downsample(points);

    expect(thinned).toHaveLength(MAX_STORED_POINTS);
    expect(thinned[0]).toEqual(points[0]);
    expect(thinned[thinned.length - 1]).toEqual(points[points.length - 1]);
  });

  it("keeps points in order with no gaps", () => {
    const thinned = downsample(climb(8000, 0.5));

    expect(thinned.every((p) => Array.isArray(p) && p.length === 4)).toBe(true);
    expect(thinned.every((p, i) => i === 0 || p[3] > thinned[i - 1][3])).toBe(true);
  });

  it("handles the smallest saveable track", () => {
    const points: TrackPoint[] = [
      [39, -106, 3000, 0],
      [39.1, -106, 3100, 60],
    ];
    expect(downsample(points)).toEqual(points);
  });
});

describe("deriveElevation", () => {
  it("measures a steady climb to within a few percent", () => {
    // 31 fixes climbing 10 m each = 300 m. Smoothing clamps at the ends, so the
    // answer lands a little low — GPS gain is an estimate, not a measurement.
    const { gainMeters, maxAltitudeMeters } = deriveElevation(climb(31, 10));

    expect(gainMeters).toBeGreaterThan(270);
    expect(gainMeters).toBeLessThanOrEqual(300);
    expect(maxAltitudeMeters).toBeGreaterThan(3290);
  });

  it("counts each climb of a rolling profile, not the descents", () => {
    // Up 200, back down 200, up another 100 — 300 m of ascent.
    const points: TrackPoint[] = [
      ...climb(21, 10),
      ...Array.from({ length: 21 }, (_, i): TrackPoint => [39, -106, 3200 - i * 10, 21 + i]),
      ...Array.from({ length: 11 }, (_, i): TrackPoint => [39, -106, 3000 + i * 10, 42 + i]),
    ];
    const { gainMeters } = deriveElevation(points);

    expect(gainMeters).toBeGreaterThan(260);
    expect(gainMeters).toBeLessThanOrEqual(300);
  });

  it("invents no gain from small altitude jitter", () => {
    expect(deriveElevation(stationaryNoise(500, 3)).gainMeters).toBe(0);
  });

  it("invents no meaningful gain from realistic GPS noise", () => {
    // +/-12 m between consecutive fixes is ordinary phone GPS while standing
    // still, and a threshold alone can't reject a swing wider than itself.
    expect(deriveElevation(stationaryNoise(1000, 12)).gainMeters).toBeLessThanOrEqual(15);
  });

  it("does not accumulate that residual over a longer track", () => {
    const short = deriveElevation(stationaryNoise(1000, 12)).gainMeters;
    const long = deriveElevation(stationaryNoise(12000, 12)).gainMeters;

    expect(long).toBe(short);
  });

  it("still finds a real climb buried in that noise", () => {
    const points: TrackPoint[] = Array.from({ length: 601 }, (_, i) => [
      39,
      -106,
      3000 + i + (i % 2 ? 12 : -12),
      i,
    ]);
    const { gainMeters } = deriveElevation(points);

    expect(gainMeters).toBeGreaterThan(540);
    expect(gainMeters).toBeLessThan(660);
  });

  it("damps a single wild fix instead of calling it the high point", () => {
    const points: TrackPoint[] = [
      ...climb(40, 1),
      [39, -106, 5000, 40],
      ...Array.from({ length: 40 }, (_, i): TrackPoint => [39, -106, 3040 - i, 41 + i]),
    ];

    expect(deriveElevation(points).maxAltitudeMeters).toBeLessThan(3500);
  });

  it("returns nulls when the GPS never reported an altitude", () => {
    const points: TrackPoint[] = [
      [39, -106, null, 0],
      [39.1, -106, null, 60],
    ];

    expect(deriveElevation(points)).toEqual({ gainMeters: null, maxAltitudeMeters: null });
  });

  it("returns nulls when only one fix had an altitude", () => {
    const points: TrackPoint[] = [
      [39, -106, 3000, 0],
      [39.1, -106, null, 60],
    ];

    expect(deriveElevation(points)).toEqual({ gainMeters: null, maxAltitudeMeters: null });
  });

  it("skips missing altitudes rather than treating them as sea level", () => {
    const points: TrackPoint[] = [
      [39, -106, 3000, 0],
      [39, -106, null, 60],
      [39, -106, 3100, 120],
    ];

    expect(deriveElevation(points)).toEqual({ gainMeters: 100, maxAltitudeMeters: 3100 });
  });
});
