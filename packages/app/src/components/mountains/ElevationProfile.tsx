"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { trpc } from "@/lib/trpc";

interface Props {
  trailId: string;
  trailheadElevation?: number | null;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { distanceMi: number; elevationFt: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { distanceMi, elevationFt } = payload[0].payload;
  return (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 2 }}>
      <Typography variant="caption" color="text.secondary" display="block">{distanceMi} mi</Typography>
      <Typography variant="body2" fontWeight={700}>{elevationFt.toLocaleString()} ft</Typography>
    </Box>
  );
}

export default function ElevationProfile({ trailId, trailheadElevation }: Props) {
  const { data, isLoading } = trpc.trail.elevationProfile.useQuery(
    { trailId },
    { staleTime: 10 * 60 * 1000 }
  );

  if (isLoading) {
    return <Skeleton variant="rounded" height={160} sx={{ borderRadius: 0 }} />;
  }
  if (!data?.points?.length) return null;

  const { points } = data;
  const minElev = Math.min(...points.map((p) => p.elevationFt));
  const maxElev = Math.max(...points.map((p) => p.elevationFt));
  const gain = maxElev - minElev;

  // Y-axis domain with a little padding
  const yMin = Math.floor((minElev - 200) / 500) * 500;
  const yMax = Math.ceil((maxElev + 200) / 500) * 500;

  return (
    <Box>
      {/* Stats row */}
      <Box sx={{ display: "flex", gap: 3, px: 3, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Start</Typography>
          <Typography variant="body2" fontWeight={600}>{points[0].elevationFt.toLocaleString()} ft</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Summit</Typography>
          <Typography variant="body2" fontWeight={600}>{maxElev.toLocaleString()} ft</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Gain</Typography>
          <Typography variant="body2" fontWeight={600}>+{gain.toLocaleString()} ft</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Distance</Typography>
          <Typography variant="body2" fontWeight={600}>{data.totalMiles} mi</Typography>
        </Box>
      </Box>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`elev-grad-${trailId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="distanceMi"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#888" }}
            tickFormatter={(v) => `${v} mi`}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#888" }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={32}
          />
          <ChartTooltip content={<CustomTooltip />} />
          {trailheadElevation && (
            <ReferenceLine
              y={trailheadElevation}
              stroke="#15803d"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
          )}
          <Area
            type="monotone"
            dataKey="elevationFt"
            stroke="#1d4ed8"
            strokeWidth={2}
            fill={`url(#elev-grad-${trailId})`}
            dot={false}
            activeDot={{ r: 4, fill: "#1d4ed8" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
