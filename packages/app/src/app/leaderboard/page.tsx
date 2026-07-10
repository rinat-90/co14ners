"use client";

import { useState } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LandscapeIcon from "@mui/icons-material/Landscape";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { trpc } from "@/lib/trpc";

type Metric = "summits" | "elevation" | "unique";

const TABS: { value: Metric; label: string; icon: React.ReactNode; unit: (n: number) => string }[] = [
  { value: "summits", label: "Summits", icon: <TerrainIcon fontSize="small" />, unit: (n) => `${n} summit${n !== 1 ? "s" : ""}` },
  { value: "elevation", label: "Elevation", icon: <TrendingUpIcon fontSize="small" />, unit: (n) => `${n.toLocaleString()} ft gained` },
  { value: "unique", label: "Unique Peaks", icon: <LandscapeIcon fontSize="small" />, unit: (n) => `${n}/58 peaks` },
];

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDAL_LABELS = ["1st", "2nd", "3rd"];

function rankBg(rank: number) {
  if (rank === 1) return "rgba(255,215,0,0.08)";
  if (rank === 2) return "rgba(192,192,192,0.08)";
  if (rank === 3) return "rgba(205,127,50,0.08)";
  return "transparent";
}

function metricValue(entry: { totalSummits: number; totalElevation: number; uniquePeaks: number }, metric: Metric) {
  if (metric === "elevation") return entry.totalElevation;
  if (metric === "unique") return entry.uniquePeaks;
  return entry.totalSummits;
}

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>("summits");

  const { data, isLoading } = trpc.user.leaderboard.useQuery({ metric, limit: 50 });

  const currentTab = TABS.find((t) => t.value === metric)!;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />
      <Box sx={{ maxWidth: 680, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <EmojiEventsIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, lineHeight: 1.1 }}>
              Leaderboard
            </Typography>
            <Typography variant="body2" color="text.secondary">Top Colorado 14er climbers</Typography>
          </Box>
        </Stack>

        {/* Metric tabs */}
        <Tabs
          value={metric}
          onChange={(_, v) => setMetric(v as Metric)}
          sx={{ mb: 3, "& .MuiTab-root": { minHeight: 40, fontSize: "0.8125rem" } }}
        >
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} icon={t.icon as React.ReactElement} iconPosition="start" />
          ))}
        </Tabs>

        {/* Rankings */}
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, px: 2, py: 1.5, borderBottom: i < 9 ? "1px solid" : "none", borderColor: "divider" }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="40%" height={18} />
                  <Skeleton width="25%" height={14} />
                </Box>
                <Skeleton width={80} height={18} />
              </Box>
            ))
          ) : !data || data.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography color="text.secondary">No data yet — start logging summits!</Typography>
            </Box>
          ) : (
            data.map((entry, i) => {
              const isTopThree = entry.rank <= 3;
              const val = metricValue(entry, metric);
              return (
                <Box
                  key={entry.user.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    px: 2,
                    py: 1.5,
                    bgcolor: rankBg(entry.rank),
                    borderBottom: i < data.length - 1 ? "1px solid" : "none",
                    borderColor: "divider",
                    transition: "background 0.15s",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  {/* Rank */}
                  <Box sx={{ width: 32, textAlign: "center", flexShrink: 0 }}>
                    {isTopThree ? (
                      <Tooltip title={MEDAL_LABELS[entry.rank - 1]}>
                        <EmojiEventsIcon sx={{ fontSize: 22, color: MEDAL_COLORS[entry.rank - 1] }} />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.disabled" fontWeight={600}>
                        {entry.rank}
                      </Typography>
                    )}
                  </Box>

                  {/* Avatar */}
                  <Avatar
                    component={NextLink}
                    href={`/users/${entry.user.id}`}
                    src={entry.user.avatar ?? undefined}
                    sx={{ width: 36, height: 36, fontSize: 13, flexShrink: 0, textDecoration: "none", fontWeight: 700 }}
                  >
                    {!entry.user.avatar && (entry.user.name ?? entry.user.email).slice(0, 2).toUpperCase()}
                  </Avatar>

                  {/* Name */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      component={NextLink}
                      href={`/users/${entry.user.id}`}
                      variant="body2"
                      fontWeight={700}
                      noWrap
                      sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" }, display: "block" }}
                    >
                      {entry.user.name ?? entry.user.email.split("@")[0]}
                    </Typography>
                    {/* Secondary stats */}
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {metric !== "summits" && (
                        <Typography variant="caption" color="text.disabled">{entry.totalSummits} logged</Typography>
                      )}
                      {metric !== "unique" && (
                        <Typography variant="caption" color="text.disabled">{entry.uniquePeaks}/58 unique</Typography>
                      )}
                    </Stack>
                  </Box>

                  {/* Primary metric chip */}
                  <Chip
                    icon={currentTab.icon as React.ReactElement}
                    label={currentTab.unit(val)}
                    size="small"
                    color={isTopThree ? "primary" : "default"}
                    variant={isTopThree ? "filled" : "outlined"}
                    sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                  />
                </Box>
              );
            })
          )}
        </Paper>
      </Box>
      <BottomNav />
    </Box>
  );
}
