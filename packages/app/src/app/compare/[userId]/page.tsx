"use client";

import { use } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LandscapeIcon from "@mui/icons-material/Landscape";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import StarIcon from "@mui/icons-material/Star";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

type StatSide = {
  user: { id: string; name: string | null; email: string; avatar: string | null };
  totalSummits: number;
  uniquePeaks: number;
  totalElevation: number;
  topPeak: { name: string; altitude: number } | null;
  achievementCount: number;
  currentStreak: number;
  longestStreak: number;
};

function UserColumn({ side, winner }: { side: StatSide; winner: boolean }) {
  const displayName = side.user.name ?? side.user.email.split("@")[0];
  return (
    <Stack alignItems="center" spacing={1.5} flex={1} minWidth={0}>
      <Avatar
        component={NextLink}
        href={`/users/${side.user.id}`}
        src={side.user.avatar ?? undefined}
        sx={{
          width: 72,
          height: 72,
          fontSize: 22,
          fontWeight: 700,
          border: winner ? "3px solid" : "2px solid",
          borderColor: winner ? "primary.main" : "divider",
          textDecoration: "none",
        }}
      >
        {!side.user.avatar && initials(side.user.name, side.user.email)}
      </Avatar>
      <Box textAlign="center">
        <Typography
          component={NextLink}
          href={`/users/${side.user.id}`}
          variant="subtitle1"
          fontWeight={700}
          noWrap
          sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" }, display: "block" }}
        >
          {displayName}
        </Typography>
        {winner && (
          <Chip
            label="Ahead"
            size="small"
            color="primary"
            icon={<EmojiEventsIcon />}
            sx={{ height: 18, fontSize: "0.65rem", "& .MuiChip-label": { px: 0.75 } }}
          />
        )}
      </Box>
    </Stack>
  );
}

function MetricRow({
  icon,
  label,
  meVal,
  themVal,
  format,
}: {
  icon: React.ReactNode;
  label: string;
  meVal: number;
  themVal: number;
  format: (n: number) => string;
}) {
  const meWins = meVal > themVal;
  const themWins = themVal > meVal;
  const tie = meVal === themVal;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        borderColor: tie ? "divider" : "transparent",
        boxShadow: tie ? "none" : "0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Label row */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1, bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          {label}
        </Typography>
      </Stack>

      {/* Values row */}
      <Stack direction="row" sx={{ minHeight: 56 }}>
        {/* Me */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 2,
            py: 1.5,
            bgcolor: meWins ? "primary.50" : "transparent",
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={800} color={meWins ? "primary.main" : "text.primary"} textAlign="center" noWrap>
            {format(meVal)}
          </Typography>
        </Box>

        {/* Them */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 2,
            py: 1.5,
            bgcolor: themWins ? "primary.50" : "transparent",
          }}
        >
          <Typography variant="h6" fontWeight={800} color={themWins ? "primary.main" : "text.primary"} textAlign="center" noWrap>
            {format(themVal)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function CompareSkeleton() {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} justifyContent="space-around">
        <Stack alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={72} height={72} />
          <Skeleton width={80} />
        </Stack>
        <Stack alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={72} height={72} />
          <Skeleton width={80} />
        </Stack>
      </Stack>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
  );
}

export default function ComparePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { accessToken, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !accessToken) {
      router.replace(`/auth/login?redirect=/compare/${userId}`);
    }
  }, [authLoading, accessToken, userId, router]);

  const { data, isLoading } = trpc.user.compare.useQuery({ userId }, { enabled: !!accessToken });

  if (authLoading || (!accessToken && !data)) return null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />
      <Box sx={{ maxWidth: 560, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>
        {/* Back button */}
        <Button
          component={NextLink}
          href={`/users/${userId}`}
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Back to profile
        </Button>

        {/* Title */}
        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <TerrainIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700}>
            Head-to-Head
          </Typography>
        </Stack>

        {isLoading || !data ? (
          <CompareSkeleton />
        ) : (
          <Stack spacing={3}>
            {/* User headers */}
            <Stack direction="row" spacing={2} px={1}>
              <UserColumn side={data.me} winner={data.me.totalSummits > data.them.totalSummits} />
              <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <Typography variant="h6" fontWeight={900} color="text.disabled">
                  VS
                </Typography>
              </Box>
              <UserColumn side={data.them} winner={data.them.totalSummits > data.me.totalSummits} />
            </Stack>

            {/* Column labels */}
            <Stack direction="row" px={1}>
              <Typography variant="caption" fontWeight={700} color="primary.main" flex={1} textAlign="center" noWrap>
                You
              </Typography>
              <Box sx={{ width: 40 }} />
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                flex={1}
                textAlign="center"
                noWrap
                component={NextLink}
                href={`/users/${userId}`}
                sx={{ textDecoration: "none", "&:hover": { color: "primary.main" } }}
              >
                {data.them.user.name ?? data.them.user.email.split("@")[0]}
              </Typography>
            </Stack>

            {/* Metrics */}
            <MetricRow
              icon={<TerrainIcon fontSize="small" />}
              label="Total Summits"
              meVal={data.me.totalSummits}
              themVal={data.them.totalSummits}
              format={(n) => n.toString()}
            />

            <MetricRow
              icon={<LandscapeIcon fontSize="small" />}
              label="Unique Peaks"
              meVal={data.me.uniquePeaks}
              themVal={data.them.uniquePeaks}
              format={(n) => `${n}/58`}
            />

            <MetricRow
              icon={<TrendingUpIcon fontSize="small" />}
              label="Elevation Gained"
              meVal={data.me.totalElevation}
              themVal={data.them.totalElevation}
              format={(n) => `${n.toLocaleString()} ft`}
            />

            <MetricRow
              icon={<LocalFireDepartmentIcon fontSize="small" />}
              label="Current Streak"
              meVal={data.me.currentStreak}
              themVal={data.them.currentStreak}
              format={(n) => (n === 0 ? "–" : `${n}mo`)}
            />

            <MetricRow
              icon={<EmojiEventsIcon fontSize="small" />}
              label="Achievements"
              meVal={data.me.achievementCount}
              themVal={data.them.achievementCount}
              format={(n) => n.toString()}
            />

            {/* Top peaks */}
            {(data.me.topPeak || data.them.topPeak) && (
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ px: 2, py: 1, bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <StarIcon sx={{ color: "warning.main", fontSize: 18 }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                    Highest Peak Summited
                  </Typography>
                </Stack>
                <Stack direction="row">
                  <Box sx={{ flex: 1, px: 2, py: 1.5, borderRight: "1px solid", borderColor: "divider" }}>
                    {data.me.topPeak ? (
                      <>
                        <Typography variant="body2" fontWeight={700} noWrap>{data.me.topPeak.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{data.me.topPeak.altitude.toLocaleString()} ft</Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.disabled">–</Typography>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, px: 2, py: 1.5 }}>
                    {data.them.topPeak ? (
                      <>
                        <Typography variant="body2" fontWeight={700} noWrap>{data.them.topPeak.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{data.them.topPeak.altitude.toLocaleString()} ft</Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.disabled">–</Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* Overall winner banner */}
            {(() => {
              const meScore =
                (data.me.totalSummits > data.them.totalSummits ? 1 : 0) +
                (data.me.uniquePeaks > data.them.uniquePeaks ? 1 : 0) +
                (data.me.totalElevation > data.them.totalElevation ? 1 : 0) +
                (data.me.currentStreak > data.them.currentStreak ? 1 : 0) +
                (data.me.achievementCount > data.them.achievementCount ? 1 : 0);
              const themScore = 5 - meScore - [data.me.totalSummits === data.them.totalSummits, data.me.uniquePeaks === data.them.uniquePeaks, data.me.totalElevation === data.them.totalElevation, data.me.currentStreak === data.them.currentStreak, data.me.achievementCount === data.them.achievementCount].filter(Boolean).length;

              if (meScore === themScore) {
                return (
                  <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "action.selected", textAlign: "center" }}>
                    <Typography fontWeight={700}>Evenly matched! 🤝</Typography>
                  </Paper>
                );
              }

              const winnerName = meScore > themScore ? "You" : (data.them.user.name ?? data.them.user.email.split("@")[0]);
              return (
                <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "primary.50", textAlign: "center", border: "1px solid", borderColor: "primary.200" }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                    <EmojiEventsIcon sx={{ color: "#FFD700" }} />
                    <Typography fontWeight={700} color="primary.main">
                      {winnerName} {meScore > themScore ? "lead" : "leads"} {Math.max(meScore, themScore)}–{Math.min(meScore, themScore)}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })()}
          </Stack>
        )}
      </Box>
      <BottomNav />
    </Box>
  );
}
