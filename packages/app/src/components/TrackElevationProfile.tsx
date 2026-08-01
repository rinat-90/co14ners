"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { metersToFeet, metersToMiles, type TrackPoint } from "@/lib/track";

/**
 * Elevation against distance for a recorded track, as a plain SVG area chart —
 * a charting library would be a lot of bundle for one sparkline, and the shape
 * (where the climbing happened, where it flattened out) is the whole point.
 *
 * Distance rather than time on the x-axis: a rest stop shouldn't stretch the
 * profile sideways.
 */
export default function TrackElevationProfile({
  points,
  height = 120,
}: {
  points: TrackPoint[];
  height?: number;
}) {
  const samples = buildSamples(points);
  if (!samples) return null;

  const { path, area, minFeet, maxFeet, totalMiles } = samples;

  return (
    <Box>
      <Box sx={{ position: "relative", width: "100%", height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#elevFill)" />
          {/* Non-scaling stroke keeps the line 2px thick despite the squashed viewBox */}
          <path
            d={path}
            fill="none"
            stroke="#f97316"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>

        <Typography
          variant="caption"
          sx={{ position: "absolute", top: 0, left: 0, color: "text.secondary", fontSize: "0.65rem" }}
        >
          {maxFeet.toLocaleString()} ft
        </Typography>
        <Typography
          variant="caption"
          sx={{ position: "absolute", bottom: 0, left: 0, color: "text.secondary", fontSize: "0.65rem" }}
        >
          {minFeet.toLocaleString()} ft
        </Typography>
        <Typography
          variant="caption"
          sx={{ position: "absolute", bottom: 0, right: 0, color: "text.secondary", fontSize: "0.65rem" }}
        >
          {totalMiles.toFixed(1)} mi
        </Typography>
      </Box>
    </Box>
  );
}

function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(x));
}

/** null when too few points carried an altitude to draw anything honest. */
function buildSamples(points: TrackPoint[]) {
  let cumulative = 0;
  const samples: { distance: number; altitude: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    if (i > 0) cumulative += haversineMeters(points[i - 1], points[i]);
    const altitude = points[i][2];
    if (altitude !== null) samples.push({ distance: cumulative, altitude });
  }

  if (samples.length < 3 || cumulative <= 0) return null;

  const altitudes = samples.map((s) => s.altitude);
  const minMeters = Math.min(...altitudes);
  const maxMeters = Math.max(...altitudes);
  // A dead-flat profile would divide by zero; pad it into a visible band instead.
  const span = maxMeters - minMeters || 1;

  const coords = samples.map((s) => {
    const x = (s.distance / cumulative) * 100;
    const y = 100 - ((s.altitude - minMeters) / span) * 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return {
    path: `M ${coords.join(" L ")}`,
    area: `M ${coords.join(" L ")} L 100,100 L 0,100 Z`,
    minFeet: Math.round(metersToFeet(minMeters)),
    maxFeet: Math.round(metersToFeet(maxMeters)),
    totalMiles: metersToMiles(cumulative),
  };
}
