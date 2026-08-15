/// <reference types="bun-types" />
import { describe, expect, test, beforeAll } from "bun:test";
import { Window } from "happy-dom";
import { saveTrackSchema } from "@co14ners/api/src/hikeTrack/hikeTrack.schema";
import { trackToGPX, type TrackPoint } from "../track";
import {
  GpxParseError,
  dropStationaryFixes,
  haversineMeters,
  matchMountains,
  movingSeconds,
  parseGpx,
  thinFixes,
  type RawFix,
} from "../gpxImport";

// The parser runs in the browser, so the tests need a real DOM implementation
// rather than a hand-rolled stand-in — a shim would only be testing itself.
beforeAll(() => {
  const window = new Window();
  (globalThis as unknown as { DOMParser: unknown }).DOMParser = window.DOMParser;
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ELBERT = { lat: 39.1178, lon: -106.4453 };

/** A GPX file shaped like the ones Gaia and Strava produce. */
function gpxFile(
  trkpts: string,
  { name = "Mount Elbert", metadata = true }: { name?: string; metadata?: boolean } = {}
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  ${metadata ? `<metadata><name>${name} export</name></metadata>` : ""}
  <trk>
    <name>${name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/** `count` fixes walking north from `from`, one per `intervalSec`, climbing steadily. */
function walk({
  count,
  metersPerStep = 20,
  intervalSec = 10,
  from = ELBERT,
  startEle = 3000,
  metersUpPerStep = 1,
  startTime = "2025-07-04T12:00:00Z",
}: {
  count: number;
  metersPerStep?: number;
  intervalSec?: number;
  from?: { lat: number; lon: number };
  startEle?: number;
  metersUpPerStep?: number;
  startTime?: string;
} = { count: 10 }): string {
  const t0 = Date.parse(startTime);
  const degreesPerMeter = 1 / 111_320;
  return Array.from({ length: count }, (_, i) => {
    const lat = from.lat + i * metersPerStep * degreesPerMeter;
    const time = new Date(t0 + i * intervalSec * 1000).toISOString();
    return `      <trkpt lat="${lat.toFixed(6)}" lon="${from.lon.toFixed(6)}"><ele>${startEle + i * metersUpPerStep}</ele><time>${time}</time></trkpt>`;
  }).join("\n");
}

function fixes(times: number[]): RawFix[] {
  return times.map((t) => ({ lat: ELBERT.lat, lon: ELBERT.lon, ele: 3000, time: t * 1000 }));
}

// ── Parsing ───────────────────────────────────────────────────────────────────

describe("parseGpx", () => {
  test("reads points, name, times and distance from an ordinary track", () => {
    const parsed = parseGpx(gpxFile(walk({ count: 10, metersPerStep: 20, intervalSec: 10 })));

    expect(parsed.name).toBe("Mount Elbert");
    expect(parsed.points).toHaveLength(10);
    expect(parsed.rawPointCount).toBe(10);
    expect(parsed.startedAt.toISOString()).toBe("2025-07-04T12:00:00.000Z");
    expect(parsed.endedAt.toISOString()).toBe("2025-07-04T12:01:30.000Z");
    // 9 steps of 20 m.
    expect(parsed.distanceMeters).toBeCloseTo(180, 0);
  });

  test("point offsets are whole seconds from the start", () => {
    const parsed = parseGpx(gpxFile(walk({ count: 5, intervalSec: 30 })));
    expect(parsed.points.map((p) => p[3])).toEqual([0, 30, 60, 90, 120]);
  });

  test("keeps elevation and drops physically impossible values", () => {
    const parsed = parseGpx(
      gpxFile(`      <trkpt lat="39.1178" lon="-106.4453"><ele>4300</ele><time>2025-07-04T12:00:00Z</time></trkpt>
      <trkpt lat="39.1188" lon="-106.4453"><ele>-32768</ele><time>2025-07-04T12:00:30Z</time></trkpt>
      <trkpt lat="39.1198" lon="-106.4453"><ele>4310</ele><time>2025-07-04T12:01:00Z</time></trkpt>`)
    );
    expect(parsed.points.map((p) => p[2])).toEqual([4300, null, 4310]);
  });

  test("tolerates points with no elevation at all", () => {
    const parsed = parseGpx(
      gpxFile(`      <trkpt lat="39.1178" lon="-106.4453"><time>2025-07-04T12:00:00Z</time></trkpt>
      <trkpt lat="39.1198" lon="-106.4453"><time>2025-07-04T12:01:00Z</time></trkpt>`)
    );
    expect(parsed.points.map((p) => p[2])).toEqual([null, null]);
  });

  test("sorts fixes that were written out of order", () => {
    const parsed = parseGpx(
      gpxFile(`      <trkpt lat="39.1198" lon="-106.4453"><time>2025-07-04T12:02:00Z</time></trkpt>
      <trkpt lat="39.1178" lon="-106.4453"><time>2025-07-04T12:00:00Z</time></trkpt>
      <trkpt lat="39.1188" lon="-106.4453"><time>2025-07-04T12:01:00Z</time></trkpt>`)
    );
    expect(parsed.points.map((p) => p[3])).toEqual([0, 60, 120]);
    expect(parsed.startedAt.toISOString()).toBe("2025-07-04T12:00:00.000Z");
  });

  test("falls back to the metadata name when the track has none", () => {
    const xml = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Morning hike</name></metadata>
  <trk><trkseg>
${walk({ count: 3 })}
  </trkseg></trk>
</gpx>`;
    expect(parseGpx(xml).name).toBe("Morning hike");
  });

  test("reads files whose GPX elements carry a namespace prefix", () => {
    const xml = `<?xml version="1.0"?>
<g:gpx version="1.1" xmlns:g="http://www.topografix.com/GPX/1/1">
  <g:trk><g:name>Prefixed</g:name><g:trkseg>
    <g:trkpt lat="39.1178" lon="-106.4453"><g:ele>4300</g:ele><g:time>2025-07-04T12:00:00Z</g:time></g:trkpt>
    <g:trkpt lat="39.1278" lon="-106.4453"><g:ele>4310</g:ele><g:time>2025-07-04T12:10:00Z</g:time></g:trkpt>
  </g:trkseg></g:trk>
</g:gpx>`;
    const parsed = parseGpx(xml);
    expect(parsed.name).toBe("Prefixed");
    expect(parsed.points).toHaveLength(2);
    expect(parsed.points[0][2]).toBe(4300);
  });

  test("merges every segment of a track that was split by signal loss", () => {
    const xml = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Split</name>
    <trkseg>${walk({ count: 4, startTime: "2025-07-04T12:00:00Z" })}</trkseg>
    <trkseg>${walk({ count: 4, from: { lat: 39.13, lon: -106.4453 }, startTime: "2025-07-04T13:00:00Z" })}</trkseg>
  </trk>
</gpx>`;
    expect(parseGpx(xml).points).toHaveLength(8);
  });

  test("a dense 1 Hz recording is reduced by the step filter, not the point cap", () => {
    // What a watch actually produces: a fix every second, most of them less than
    // a stride apart. In practice this is what keeps real imports well under the
    // API's ceiling — the 20,000 cap below is only a backstop.
    const parsed = parseGpx(gpxFile(walk({ count: 25_000, metersPerStep: 1, intervalSec: 1 })));

    expect(parsed.rawPointCount).toBe(25_000);
    expect(parsed.points.length).toBeLessThan(6_000);
    expect(parsed.points[0][3]).toBe(0);
    expect(parsed.points[parsed.points.length - 1][3]).toBe(24_999);
  });

  test("thins tracks that still exceed what the API accepts, keeping both ends", () => {
    // Contrived: 25,000 fixes that all clear the 5 m step, so only the cap can
    // bring the count down.
    const parsed = parseGpx(gpxFile(walk({ count: 25_000, metersPerStep: 6, intervalSec: 1 })));

    expect(parsed.rawPointCount).toBe(25_000);
    expect(parsed.points).toHaveLength(20_000);
    expect(parsed.points[0][3]).toBe(0);
    expect(parsed.points[parsed.points.length - 1][3]).toBe(24_999);
  });

  test("rejects a planned route with no timestamps, by name", () => {
    const xml = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <rte><rtept lat="39.1178" lon="-106.4453"><ele>4300</ele></rtept>
       <rtept lat="39.1278" lon="-106.4453"><ele>4310</ele></rtept></rte>
</gpx>`;
    expect(() => parseGpx(xml)).toThrow(GpxParseError);
    expect(() => parseGpx(xml)).toThrow(/no timestamps/);
  });

  test("rejects a track longer than the API's 48-hour ceiling", () => {
    const xml = gpxFile(
      `      <trkpt lat="39.1178" lon="-106.4453"><time>2025-07-01T12:00:00Z</time></trkpt>
      <trkpt lat="39.1278" lon="-106.4453"><time>2025-07-05T12:00:00Z</time></trkpt>`
    );
    expect(() => parseGpx(xml)).toThrow(/48 hours/);
  });

  test("rejects a recording too long to be a hike, rather than letting the API reject it", () => {
    // 500 km — a drive, or a whole trip left recording.
    const xml = gpxFile(walk({ count: 2_000, metersPerStep: 250, intervalSec: 60 }));
    expect(() => parseGpx(xml)).toThrow(GpxParseError);
    expect(() => parseGpx(xml)).toThrow(/further than any hike/);
  });

  test("rejects XML that isn't GPX", () => {
    expect(() => parseGpx("<?xml version=\"1.0\"?><kml><Placemark/></kml>")).toThrow(/isn't a GPX file/);
  });

  test("rejects a file with a single fix", () => {
    const xml = gpxFile(`      <trkpt lat="39.1178" lon="-106.4453"><time>2025-07-04T12:00:00Z</time></trkpt>`);
    expect(() => parseGpx(xml)).toThrow(/no recorded track/);
  });
});

// ── Round trip through our own exporter ───────────────────────────────────────

describe("a track exported by this app can be imported back", () => {
  test("geometry, timing and elevation survive the round trip", () => {
    const startedAt = new Date("2025-07-04T12:00:00Z");
    // ~28 m apart, so nothing is lost to the stationary-fix filter.
    const original: TrackPoint[] = Array.from({ length: 60 }, (_, i) => [
      39.1178 + i * 0.00025,
      -106.4453,
      3000 + i * 4,
      i * 30,
    ]);

    const reimported = parseGpx(trackToGPX({ name: "Mount Elbert", startedAt, points: original }));

    expect(reimported.name).toBe("Mount Elbert");
    expect(reimported.points).toHaveLength(original.length);
    expect(reimported.startedAt.getTime()).toBe(startedAt.getTime());
    expect(reimported.points.map((p) => p[3])).toEqual(original.map((p) => p[3]));
    for (const [i, point] of reimported.points.entries()) {
      expect(point[0]).toBeCloseTo(original[i][0], 5);
      expect(point[1]).toBeCloseTo(original[i][1], 5);
      expect(point[2]).toBeCloseTo(original[i][2] as number, 1);
    }
  });

  test("points with no elevation stay null through the round trip", () => {
    const original: TrackPoint[] = [
      [39.1178, -106.4453, null, 0],
      [39.1278, -106.4453, null, 600],
    ];
    const reimported = parseGpx(
      trackToGPX({ name: "No elevation", startedAt: new Date("2025-07-04T12:00:00Z"), points: original })
    );
    expect(reimported.points.map((p) => p[2])).toEqual([null, null]);
  });
});

// ── The parser's output has to satisfy the API ────────────────────────────────

describe("parsed output is accepted by saveTrackSchema", () => {
  // Validating against the server's real schema rather than a copy of it: the
  // point of this test is to catch a parser change that the API would reject —
  // a non-integer time offset, an out-of-range altitude, too many points.
  function asSaveInput(parsed: ReturnType<typeof parseGpx>) {
    return {
      mountainId: "cm000000000000000000000",
      startedAt: parsed.startedAt.toISOString(),
      endedAt: parsed.endedAt.toISOString(),
      durationSec: parsed.durationSec,
      distanceMeters: parsed.distanceMeters,
      points: parsed.points,
      isPublic: true,
    };
  }

  test("an ordinary hike validates", () => {
    const parsed = parseGpx(gpxFile(walk({ count: 500, metersPerStep: 20, intervalSec: 10 })));
    expect(saveTrackSchema.safeParse(asSaveInput(parsed)).success).toBe(true);
  });

  test("a track thinned from 25,000 fixes still validates", () => {
    const parsed = parseGpx(gpxFile(walk({ count: 25_000, metersPerStep: 6, intervalSec: 1 })));
    expect(parsed.points).toHaveLength(20_000);
    expect(saveTrackSchema.safeParse(asSaveInput(parsed)).success).toBe(true);
  });

  test("a hike right up against the 48-hour limit validates", () => {
    // 47.9 hours of fixes 10 minutes apart, which also exercises the
    // moving-time fallback.
    const parsed = parseGpx(
      gpxFile(walk({ count: 288, metersPerStep: 60, intervalSec: 599 }))
    );
    const result = saveTrackSchema.safeParse(asSaveInput(parsed));
    expect(result.success).toBe(true);
    expect(parsed.points[parsed.points.length - 1][3]).toBeLessThanOrEqual(48 * 60 * 60);
  });

  test("nulled-out bad altitudes validate", () => {
    const parsed = parseGpx(
      gpxFile(`      <trkpt lat="39.1178" lon="-106.4453"><ele>-32768</ele><time>2025-07-04T12:00:00Z</time></trkpt>
      <trkpt lat="39.1278" lon="-106.4453"><ele>99999</ele><time>2025-07-04T12:10:00Z</time></trkpt>`)
    );
    expect(saveTrackSchema.safeParse(asSaveInput(parsed)).success).toBe(true);
  });
});

// ── Distance and stationary noise ─────────────────────────────────────────────

describe("dropStationaryFixes", () => {
  test("collapses a stationary cluster to its endpoints", () => {
    const stalled: RawFix[] = Array.from({ length: 200 }, (_, i) => ({
      lat: ELBERT.lat + (i % 2) * 0.00001, // ~1 m of jitter, well under the 5 m step
      lon: ELBERT.lon,
      ele: 3000,
      time: i * 1000,
    }));
    expect(dropStationaryFixes(stalled)).toHaveLength(2);
  });

  test("keeps every fix of a genuine walk", () => {
    const walking: RawFix[] = Array.from({ length: 50 }, (_, i) => ({
      lat: ELBERT.lat + i * 0.0002, // ~22 m apart
      lon: ELBERT.lon,
      ele: 3000,
      time: i * 10_000,
    }));
    expect(dropStationaryFixes(walking)).toHaveLength(50);
  });

  test("a lunch stop does not add distance to the hike", () => {
    // 100 stationary fixes wedged into the middle of a 20-step walk.
    const jitter = Array.from({ length: 100 }, (_, i) => ({
      lat: ELBERT.lat + 0.002 + (i % 2) * 0.00001,
      lon: ELBERT.lon,
      ele: 3000,
      time: 200_000 + i * 1000,
    }));
    const before: RawFix[] = Array.from({ length: 10 }, (_, i) => ({
      lat: ELBERT.lat + i * 0.0002,
      lon: ELBERT.lon,
      ele: 3000,
      time: i * 10_000,
    }));
    const kept = dropStationaryFixes([...before, ...jitter]);

    let distance = 0;
    for (let i = 1; i < kept.length; i++) distance += haversineMeters(kept[i - 1], kept[i]);
    // The walk alone is ~200 m; unfiltered jitter would add hundreds more.
    expect(distance).toBeLessThan(230);
  });
});

// ── Moving time ───────────────────────────────────────────────────────────────

describe("movingSeconds", () => {
  test("sums the gaps of a continuous recording", () => {
    expect(movingSeconds(fixes([0, 10, 20, 30]))).toBe(30);
  });

  test("excludes a long break from moving time", () => {
    // 30 s of walking, an hour at the summit, 30 s more.
    expect(movingSeconds(fixes([0, 10, 20, 30, 3630, 3640, 3650, 3660]))).toBe(60);
  });

  test("falls back to elapsed time when every gap is longer than the threshold", () => {
    // A device recording only on movement: 10 minutes between fixes throughout.
    expect(movingSeconds(fixes([0, 600, 1200, 1800]))).toBe(1800);
  });

  test("is zero for a single fix", () => {
    expect(movingSeconds(fixes([0]))).toBe(0);
  });
});

// ── Thinning ──────────────────────────────────────────────────────────────────

describe("thinFixes", () => {
  test("leaves a short array alone", () => {
    const items = [1, 2, 3];
    expect(thinFixes(items, 10)).toBe(items);
  });

  test("hits the cap exactly and keeps both endpoints", () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const thinned = thinFixes(items, 100);
    expect(thinned).toHaveLength(100);
    expect(thinned[0]).toBe(0);
    expect(thinned[99]).toBe(999);
  });

  test("preserves order and leaves no duplicates", () => {
    const thinned = thinFixes(Array.from({ length: 5000 }, (_, i) => i), 250);
    for (let i = 1; i < thinned.length; i++) expect(thinned[i]).toBeGreaterThan(thinned[i - 1]);
  });
});

// ── Matching ──────────────────────────────────────────────────────────────────

describe("matchMountains", () => {
  const elbert = { id: "elbert", name: "Mount Elbert", latitude: 39.1178, longitude: -106.4453 };
  const massive = { id: "massive", name: "Mount Massive", latitude: 39.1875, longitude: -106.4757 };
  const bierstadt = { id: "bierstadt", name: "Mount Bierstadt", latitude: 39.5827, longitude: -105.6688 };
  const peaks = [elbert, massive, bierstadt];

  test("picks the peak the track actually stood on", () => {
    const parsed = parseGpx(gpxFile(walk({ count: 20, metersPerStep: 30 })));
    const matches = matchMountains(parsed.points, peaks);

    expect(matches[0].mountain.id).toBe("elbert");
    expect(matches[0].reachedSummit).toBe(true);
  });

  test("a turnaround well below the summit is still matched, but not a summit", () => {
    // Starts 1 km north of Elbert and walks further away.
    const start = { lat: ELBERT.lat + 0.009, lon: ELBERT.lon };
    const parsed = parseGpx(gpxFile(walk({ count: 20, metersPerStep: 30, from: start })));
    const matches = matchMountains(parsed.points, peaks);

    expect(matches[0].mountain.id).toBe("elbert");
    expect(matches[0].reachedSummit).toBe(false);
    expect(matches[0].closestMeters).toBeGreaterThan(900);
  });

  test("offers neighbouring peaks as alternates, nearest first", () => {
    // In the basin between Elbert and Massive: within 4 km of both, closest to
    // Elbert (3.4 km) at the start and to Massive (3.7 km) at the far end.
    const start = { lat: 39.1465, lon: -106.46 };
    const parsed = parseGpx(gpxFile(walk({ count: 40, metersPerStep: 30, from: start })));
    const matches = matchMountains(parsed.points, peaks);

    expect(matches.map((m) => m.mountain.id)).toEqual(["elbert", "massive"]);
    expect(matches[0].closestMeters).toBeLessThan(matches[1].closestMeters);
  });

  test("returns nothing for a track nowhere near a 14er", () => {
    const denver = { lat: 39.7392, lon: -104.9903 };
    const parsed = parseGpx(gpxFile(walk({ count: 10, from: denver })));
    expect(matchMountains(parsed.points, peaks)).toHaveLength(0);
  });

  test("finds a summit that thinning would otherwise step over", () => {
    // 4,000 fixes far from any peak, with one high fix on Elbert's summit in the
    // middle — the stride samples ~1,500, so only the high-point check saves it.
    const away = { lat: 39.4, lon: -106.9 };
    const points: [number, number, number | null, number][] = Array.from({ length: 4000 }, (_, i) => [
      away.lat + i * 0.000001,
      away.lon,
      3000,
      i,
    ]);
    points[1999] = [ELBERT.lat, ELBERT.lon, 4400, 1999];

    const matches = matchMountains(points, peaks);
    expect(matches[0]?.mountain.id).toBe("elbert");
    expect(matches[0].reachedSummit).toBe(true);
  });
});
