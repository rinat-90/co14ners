/**
 * End-to-end check of GPX import against a running stack.
 *
 * The unit tests cover the parser in isolation; this drives the same code path
 * the dialog does — parse, match, `hikeTrack.save`, `user.logSummit` — against
 * the real API and then reads the result back the way the UI would.
 *
 *   bun run scripts/verify-gpx-import.ts [apiUrl]
 */

/// <reference types="bun-types" />
import { Window } from "happy-dom";
(globalThis as unknown as { DOMParser: unknown }).DOMParser = new Window().DOMParser;

const { parseGpx, matchMountains } = await import("../src/lib/gpxImport");

const API = process.argv[2] ?? "http://localhost:3001/trpc";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function call(path: string, opts: { input?: unknown; token?: string; mutation?: boolean }) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;

  const url = opts.mutation
    ? `${API}/${path}`
    : `${API}/${path}?input=${encodeURIComponent(JSON.stringify(opts.input ?? {}))}`;

  const res = await fetch(url, {
    method: opts.mutation ? "POST" : "GET",
    headers,
    body: opts.mutation ? JSON.stringify(opts.input ?? {}) : undefined,
  });
  const body = (await res.json()) as { result?: { data: unknown }; error?: { message: string } };
  if (body.error) throw new Error(`${path}: ${body.error.message}`);
  return body.result?.data;
}

/** A GPX file shaped like a real export: 1 Hz, noisy altitude, a summit stop. */
function buildGpx(summit: { latitude: number; longitude: number }, startIso: string): string {
  const t0 = Date.parse(startIso);
  const degPerM = 1 / 111_320;
  const rows: string[] = [];

  // 3 km approach from the south, climbing 900 m, ending on the summit.
  const steps = 600;
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const lat = summit.latitude - (3000 * (1 - frac)) * degPerM;
    // ±6 m of altimeter wander on top of a real climb.
    const ele = 3400 + 900 * frac + (i % 2 === 0 ? 6 : -6);
    rows.push(
      `<trkpt lat="${lat.toFixed(6)}" lon="${summit.longitude.toFixed(6)}"><ele>${ele.toFixed(1)}</ele><time>${new Date(t0 + i * 10_000).toISOString()}</time></trkpt>`
    );
  }
  // Twenty minutes standing on the summit, jittering by a metre.
  for (let i = 0; i < 120; i++) {
    const lat = summit.latitude + (i % 2) * 0.00001;
    rows.push(
      `<trkpt lat="${lat.toFixed(6)}" lon="${summit.longitude.toFixed(6)}"><ele>${(4300 + (i % 3)).toFixed(1)}</ele><time>${new Date(t0 + 6_000_000 + i * 10_000).toISOString()}</time></trkpt>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Gaia GPS" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Exported track</name></metadata>
  <trk><name>Summit day</name><type>hiking</type><trkseg>
${rows.join("\n")}
  </trkseg></trk>
</gpx>`;
}

// ── Run ───────────────────────────────────────────────────────────────────────

const stamp = process.env.RUN_STAMP ?? String(process.hrtime.bigint());
const email = `gpx-import-${stamp}@example.test`;

console.log(`\nGPX import verification against ${API}\n`);

const auth = (await call("auth.register", {
  mutation: true,
  input: { email, password: "TestPass123!", name: "GPX Import Test" },
})) as { accessToken: string; user: { id: string } };

const mountains = (await call("mountain.list", { input: {} })) as {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}[];

const elbert = mountains.find((m) => m.name.includes("Elbert"))!;
const startIso = "2025-08-12T11:00:00.000Z";

console.log("Parsing");
const parsed = parseGpx(buildGpx(elbert, startIso));
check("track name comes from <trk>, not <metadata>", parsed.name === "Summit day", String(parsed.name));
check("start time matches the first fix", parsed.startedAt.toISOString() === startIso);
check(
  "distance is about the 3 km walked",
  parsed.distanceMeters > 2800 && parsed.distanceMeters < 3200,
  `${Math.round(parsed.distanceMeters)} m`
);
check(
  "the 20-minute summit stop is excluded from moving time",
  parsed.durationSec > 5900 && parsed.durationSec < 6300,
  `${parsed.durationSec} s`
);
check(
  "the stationary summit fixes are collapsed",
  parsed.points.length < parsed.rawPointCount,
  `${parsed.rawPointCount} → ${parsed.points.length}`
);

console.log("\nMatching");
const matches = matchMountains(parsed.points, mountains);
check("nearest peak is Mount Elbert", matches[0]?.mountain.id === elbert.id, matches[0]?.mountain.name);
check("the track is recognised as reaching the summit", matches[0]?.reachedSummit === true);

console.log("\nSaving");
const track = (await call("hikeTrack.save", {
  mutation: true,
  token: auth.accessToken,
  input: {
    mountainId: elbert.id,
    startedAt: parsed.startedAt.toISOString(),
    endedAt: parsed.endedAt.toISOString(),
    durationSec: parsed.durationSec,
    distanceMeters: parsed.distanceMeters,
    points: parsed.points,
    isPublic: true,
  },
})) as { id: string } | null;
check("the API accepted the parsed track", !!track?.id);

const summit = (await call("user.logSummit", {
  mutation: true,
  token: auth.accessToken,
  input: {
    mountainId: elbert.id,
    completedAt: parsed.endedAt.toISOString(),
    trackId: track!.id,
    isPrivate: false,
  },
})) as { completion: { id: string } };
check("a summit was logged from the import", !!summit.completion.id);

console.log("\nReading back");
const stored = (await call("hikeTrack.get", {
  input: { id: track!.id },
  token: auth.accessToken,
})) as {
  gainMeters: number | null;
  maxAltitudeMeters: number | null;
  distanceMeters: number;
  durationSec: number;
  completionId: string | null;
  pointCount: number;
};

check(
  "the server derived a plausible gain despite ±6 m altimeter noise",
  stored.gainMeters !== null && stored.gainMeters > 820 && stored.gainMeters < 980,
  `${stored.gainMeters} m (real climb 900 m)`
);
check(
  "high point matches the summit altitude, not a noise spike",
  stored.maxAltitudeMeters !== null && Math.abs(stored.maxAltitudeMeters - 4300) < 25,
  `${stored.maxAltitudeMeters} m`
);
check("the summit is linked to the imported track", stored.completionId === summit.completion.id);
check("stored distance survived the round trip", Math.abs(stored.distanceMeters - parsed.distanceMeters) < 1);
check("points were downsampled for storage", stored.pointCount <= 1500, String(stored.pointCount));

const myTracks = (await call("hikeTrack.myTracks", { token: auth.accessToken })) as { id: string }[];
check("the imported track appears in My Recorded Hikes", myTracks.some((t) => t.id === track!.id));

const onMountain = (await call("hikeTrack.forMountain", {
  input: { mountainId: elbert.id, limit: 20 },
})) as { id: string }[];
check("the imported track appears on the peak's page", onMountain.some((t) => t.id === track!.id));

// The dialog builds its duplicate warning from exactly this query.
const completions = (await call("user.completions", { token: auth.accessToken })) as {
  mountainId: string;
  completedAt: string;
}[];
const duplicateKey = `${elbert.id}|${new Date(parsed.endedAt).toDateString()}`;
const seen = new Set(completions.map((c) => `${c.mountainId}|${new Date(c.completedAt).toDateString()}`));
check("re-importing the same day would be flagged as already logged", seen.has(duplicateKey));

console.log("\nCleaning up");
// The API has no account-deletion procedure, so the run removes the rows it
// created and leaves the throwaway user behind. Drop it with:
//   delete from "User" where email like 'gpx-import-%@example.test';
await call("user.deleteCompletion", {
  mutation: true,
  token: auth.accessToken,
  input: { id: summit.completion.id },
});
await call("hikeTrack.remove", { mutation: true, token: auth.accessToken, input: { id: track!.id } });

const leftover = (await call("hikeTrack.myTracks", { token: auth.accessToken })) as unknown[];
check("nothing this run created is left behind", leftover.length === 0);
console.log(`  test user ${email} remains — delete it in psql (see comment above)`);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
