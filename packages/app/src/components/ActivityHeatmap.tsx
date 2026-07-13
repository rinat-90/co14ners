"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Build a 53-week grid (Mon → Sun) ending today */
function buildGrid(countByDay: Record<string, number>): {
  weeks: { date: Date; count: number }[][];
  monthLabels: { label: string; weekIndex: number }[];
} {
  const today = new Date();
  // Start from Monday of the week 52 weeks ago
  const dayOfWeek = today.getDay(); // 0=Sun
  // We want the grid to be Mon-based: 0=Mon, 6=Sun
  const monBasedDow = (dayOfWeek + 6) % 7;
  const gridStart = addDays(today, -(52 * 7 + monBasedDow));

  const weeks: { date: Date; count: number }[][] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < 53; w++) {
    const week: { date: Date; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(gridStart, w * 7 + d);
      if (date > today) break; // don't show future
      week.push({ date, count: countByDay[isoDate(date)] ?? 0 });
    }
    if (week.length > 0) {
      weeks.push(week);
      const month = week[0].date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          label: week[0].date.toLocaleString("en-US", { month: "short" }),
          weekIndex: w,
        });
        lastMonth = month;
      }
    }
  }

  return { weeks, monthLabels };
}

const CELL = 13; // px size of each square
const GAP = 2;   // px gap between squares

function cellColor(count: number, isDark: boolean): string {
  if (count === 0) return isDark ? "#2d2d2d" : "#ebedf0";
  if (count === 1) return isDark ? "#196127" : "#9be9a8";
  if (count === 2) return isDark ? "#239a3b" : "#40c463";
  return isDark ? "#39d353" : "#216e39";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  countByDay: Record<string, number>;
  totalSummits: number;
}

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

export default function ActivityHeatmap({ countByDay, totalSummits }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { weeks, monthLabels } = buildGrid(countByDay);

  const activeDays = Object.values(countByDay).filter((v) => v > 0).length;

  return (
    <Box>
      {/* Summary row */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          Hiking activity — past year
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {totalSummits} summit{totalSummits !== 1 ? "s" : ""} on {activeDays} day{activeDays !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* Scrollable wrapper for small screens */}
      <Box sx={{ overflowX: "auto", pb: 0.5 }}>
        <Box sx={{ display: "inline-flex", flexDirection: "column", minWidth: "max-content" }}>
          {/* Month labels */}
          <Box sx={{ display: "flex", ml: `${CELL + GAP + 4}px`, mb: `${GAP}px` }}>
            {weeks.map((_, wi) => {
              const label = monthLabels.find((m) => m.weekIndex === wi);
              return (
                <Box
                  key={wi}
                  sx={{ width: CELL + GAP, flexShrink: 0 }}
                >
                  {label && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem", lineHeight: 1 }}>
                      {label.label}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Grid body: day labels + cells */}
          <Box sx={{ display: "flex", gap: `${GAP}px` }}>
            {/* Day-of-week labels */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: `${GAP}px`, mr: "4px" }}>
              {DAY_LABELS.map((label, i) => (
                <Box key={i} sx={{ width: CELL, height: CELL, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.55rem", lineHeight: 1 }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <Box key={wi} sx={{ display: "flex", flexDirection: "column", gap: `${GAP}px` }}>
                {/* Pad top if week starts mid-week */}
                {wi === 0 && week[0].date.getDay() !== 1 && (
                  Array.from({ length: ((week[0].date.getDay() + 6) % 7) }).map((_, pi) => (
                    <Box key={`pad-${pi}`} sx={{ width: CELL, height: CELL }} />
                  ))
                )}
                {week.map(({ date, count }) => (
                  <Tooltip
                    key={isoDate(date)}
                    title={
                      count === 0
                        ? isoDate(date)
                        : `${count} summit${count !== 1 ? "s" : ""} on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    }
                    placement="top"
                    arrow
                  >
                    <Box
                      sx={{
                        width: CELL,
                        height: CELL,
                        borderRadius: "2px",
                        bgcolor: cellColor(count, isDark),
                        cursor: count > 0 ? "default" : "default",
                        transition: "opacity 0.1s",
                        "&:hover": { opacity: 0.8 },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            ))}
          </Box>

          {/* Legend */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1, ml: `${CELL + GAP + 4}px`, justifyContent: "flex-end" }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem" }}>Less</Typography>
            {[0, 1, 2, 3].map((lvl) => (
              <Box
                key={lvl}
                sx={{ width: CELL - 2, height: CELL - 2, borderRadius: "2px", bgcolor: cellColor(lvl, isDark) }}
              />
            ))}
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem" }}>More</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
