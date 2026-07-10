"use client";

import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

const RANGE_LABELS: Record<string, string> = {
  SAWATCH: "Sawatch",
  ELK: "Elk",
  SAN_JUAN: "San Juan",
  TENMILE_MOSQUITO: "Tenmile/Mosquito",
  FRONT: "Front",
  SANGRE_DE_CRISTO: "Sangre de Cristo",
  OTHER: "Other",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  CLASS_1: "Class 1",
  CLASS_2: "Class 2",
  CLASS_3: "Class 3",
  CLASS_4: "Class 4",
  CLASS_5: "Class 5",
};

const DIFFICULTY_ORDER = ["CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5"];

const PIE_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d"];

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 3, display: "flex", flexDirection: "column", gap: 0.5, minWidth: 140 }}
    >
      <Box sx={{ color: "primary.main" }}>{icon}</Box>
      <Typography variant="h5" fontWeight={800}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Paper>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {children}
    </Typography>
  );
}

export default function StatsPage() {
  const { accessToken } = useAuth();
  const { data: stats } = trpc.user.stats.useQuery(undefined, { enabled: !!accessToken });
  const { data: cs, isLoading } = trpc.user.climbingStats.useQuery(undefined, { enabled: !!accessToken });

  if (!accessToken) {
    return (
      <>
        <AppHeader />
        <Box sx={{ maxWidth: 600, mx: "auto", mt: 12, textAlign: "center", px: 3 }}>
          <BarChartIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
          <Typography variant="h5" fontWeight={700} mb={1}>Your climbing stats</Typography>
          <Typography color="text.secondary" mb={3}>Sign in to see your personal dashboard.</Typography>
          <Button variant="contained" component={NextLink} href="/login">Sign in</Button>
        </Box>
      </>
    );
  }

  // Last 12 months for bar chart
  const last12 = (() => {
    const months: { month: string; label: string; count: number; elevationGained: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const found = cs?.byMonth.find((m) => m.month === key);
      months.push({ month: key, label, count: found?.count ?? 0, elevationGained: found?.elevationGained ?? 0 });
    }
    return months;
  })();

  const rangeData = (cs?.byRange ?? []).map((r) => ({ ...r, label: RANGE_LABELS[r.range] ?? r.range }));
  const diffData = DIFFICULTY_ORDER
    .map((d) => ({ difficulty: d, label: DIFFICULTY_LABELS[d], count: cs?.byDifficulty.find((x) => x.difficulty === d)?.count ?? 0 }))
    .filter((d) => d.count > 0);

  const allTimeMiles = (stats?.totalElevationGained ?? 0) / 5280;

  return (
    <>
      <AppHeader />
      <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 2, md: 4 }, py: 4, pb: 12 }}>
        <Typography variant="h4" fontWeight={800} mb={0.5}>My Stats</Typography>
        <Typography color="text.secondary" mb={4}>Your personal climbing dashboard</Typography>

        {/* Summary cards */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={5}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={150} height={110} sx={{ borderRadius: 3 }} />
            ))
          ) : (
            <>
              <StatCard icon={<EmojiEventsIcon />} label="Total summits" value={stats?.totalSummits ?? 0} />
              <StatCard icon={<TerrainIcon />} label="Unique peaks" value={stats?.uniqueMountains ?? 0} sub="of 58" />
              <StatCard
                icon={<TrendingUpIcon />}
                label="Elevation gained"
                value={`${((stats?.totalElevationGained ?? 0) / 1000).toFixed(1)}k ft`}
                sub={`≈ ${allTimeMiles.toFixed(0)} mi vertical`}
              />
              <StatCard icon={<WhatshotIcon />} label="Ranges covered" value={stats?.rangesCovered ?? 0} sub="of 7" />
              <StatCard
                icon={<TerrainIcon sx={{ color: "secondary.main" }} />}
                label="Highest peak"
                value={stats?.highestPeak ? `${stats.highestPeak.toLocaleString()} ft` : "—"}
              />
            </>
          )}
        </Stack>

        <Grid container spacing={3}>
          {/* Summits per month bar chart */}
          <Grid size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <SectionHeader><BarChartIcon fontSize="small" /> Summits per month (last 12 mo)</SectionHeader>
              {isLoading ? (
                <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={last12} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v, name) =>
                        name === "count" ? [v, "Summits"] : [`${Number(v).toLocaleString()} ft`, "Elev. gained"]
                      }
                      labelStyle={{ fontWeight: 700 }}
                    />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Cumulative summits area chart */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <SectionHeader><TrendingUpIcon fontSize="small" /> Cumulative summits over time</SectionHeader>
              {isLoading ? (
                <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
              ) : !cs?.cumulative.length ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Typography color="text.secondary">Log your first summit to see progress!</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cs.cumulative} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="summitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [v, "Summits"]} labelStyle={{ fontWeight: 700 }} />
                    <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fill="url(#summitGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Range breakdown pie */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <SectionHeader><TerrainIcon fontSize="small" /> Summits by range</SectionHeader>
              {isLoading ? (
                <Skeleton variant="circular" width={180} height={180} sx={{ mx: "auto" }} />
              ) : !rangeData.length ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Typography color="text.secondary">No summits yet</Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <PieChart width={180} height={180}>
                    <Pie data={rangeData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                      {rangeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                  </PieChart>
                  <Stack spacing={0.5} sx={{ width: "100%" }}>
                    {rangeData.sort((a, b) => b.count - a.count).map((r, i) => (
                      <Box key={r.range} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ flex: 1 }}>{r.label}</Typography>
                        <Typography variant="caption" fontWeight={700}>{r.count}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Difficulty breakdown */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <SectionHeader>Difficulty breakdown</SectionHeader>
              {isLoading ? (
                <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
              ) : !diffData.length ? (
                <Typography color="text.secondary">No summits yet</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {diffData.map((d, i) => {
                    const pct = Math.round((d.count / (stats?.uniqueMountains || 1)) * 100);
                    return (
                      <Box key={d.difficulty}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>{d.label}</Typography>
                          <Typography variant="body2" color="text.secondary">{d.count} peak{d.count !== 1 ? "s" : ""}</Typography>
                        </Box>
                        <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }}>
                          <Box
                            sx={{
                              height: "100%",
                              width: `${pct}%`,
                              borderRadius: 4,
                              bgcolor: PIE_COLORS[i % PIE_COLORS.length],
                              transition: "width 0.6s ease",
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Grid>

          {/* Top peaks */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <SectionHeader><EmojiEventsIcon fontSize="small" /> Highest peaks summited</SectionHeader>
              {isLoading ? (
                <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
              ) : !cs?.topPeaks.length ? (
                <Typography color="text.secondary">No summits yet</Typography>
              ) : (
                <Stack divider={<Divider />}>
                  {cs.topPeaks.map((p, i) => (
                    <Box key={p.name} sx={{ py: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ width: 28, color: i === 0 ? "warning.main" : "text.disabled", textAlign: "center" }}
                      >
                        {i + 1}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(p.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${p.altitude.toLocaleString()} ft`}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <BottomNav />
    </>
  );
}
