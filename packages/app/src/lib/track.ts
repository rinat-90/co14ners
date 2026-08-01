/**
 * Shared helpers for recorded hike tracks — the wire format, the unit
 * conversions, and GPX export.
 *
 * `[latitude, longitude, altitudeMeters | null, secondsFromStart]`, matching
 * `trackPointSchema` on the API side.
 */
export type TrackPoint = [number, number, number | null, number];

const METERS_PER_MILE = 1609.34;
const FEET_PER_METER = 3.28084;

/** Narrow the `Json` column the API returns into usable points. */
export function parseTrackPoints(raw: unknown): TrackPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is TrackPoint =>
      Array.isArray(p) &&
      p.length === 4 &&
      typeof p[0] === "number" &&
      typeof p[1] === "number" &&
      (p[2] === null || typeof p[2] === "number") &&
      typeof p[3] === "number"
  );
}

export function formatTrackDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

export function formatMiles(meters: number): string {
  return `${metersToMiles(meters).toFixed(2)} mi`;
}

export function formatFeet(meters: number): string {
  return `${Math.round(metersToFeet(meters)).toLocaleString()} ft`;
}

/** Average moving pace, or null when there is nothing meaningful to divide. */
export function formatPace(meters: number, seconds: number): string | null {
  const miles = metersToMiles(meters);
  if (miles < 0.1 || seconds < 60) return null;
  const minutesPerMile = seconds / 60 / miles;
  const m = Math.floor(minutesPerMile);
  const s = Math.round((minutesPerMile - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")} /mi`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GPX 1.1 track, readable by Garmin, Gaia, CalTopo, Strava and everything else
 * that imports hikes. Point times are reconstructed from the start time plus
 * each point's offset, which is what those tools need to compute pace.
 */
export function trackToGPX({
  name,
  startedAt,
  points,
}: {
  name: string;
  startedAt: Date | string;
  points: TrackPoint[];
}): string {
  const start = new Date(startedAt);
  const trkpts = points
    .map(([lat, lon, ele, offset]) => {
      const time = new Date(start.getTime() + offset * 1000).toISOString();
      const elevation = ele === null ? "" : `<ele>${ele.toFixed(1)}</ele>`;
      return `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">${elevation}<time>${time}</time></trkpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="co14ners" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${start.toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <type>hiking</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

/** Build the GPX and hand it to the browser as a download. */
export function downloadGPX(args: { name: string; startedAt: Date | string; points: TrackPoint[] }) {
  const gpx = trackToGPX(args);
  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugifyForFile(args.name)}-${new Date(args.startedAt).toISOString().slice(0, 10)}.gpx`;
  a.click();
  // Revoking in the same tick cancels the download on some mobile browsers.
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

function slugifyForFile(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "hike"
  );
}
