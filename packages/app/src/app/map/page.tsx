"use client";

import dynamic from "next/dynamic";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TerrainIcon from "@mui/icons-material/Terrain";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import StarIcon from "@mui/icons-material/Star";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import type { ProgressPeak } from "@/components/mountains/ProgressMapInner";

// Dynamic import — Leaflet requires browser APIs
const ProgressMapInner = dynamic(
  () => import("@/components/mountains/ProgressMapInner"),
  { ssr: false, loading: () => <Skeleton variant="rounded" sx={{ height: "100%", width: "100%" }} /> }
);

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function MapPage() {
  const { accessToken } = useAuth();

  const { data: mountains, isLoading: mtsLoading } = trpc.mountain.list.useQuery({});
  const { data: completions } = trpc.user.completions.useQuery(undefined, { enabled: !!accessToken });
  const { data: favorites } = trpc.user.favorites.useQuery(undefined, { enabled: !!accessToken });

  const summitedIds = new Set(completions?.map((c) => c.mountainId) ?? []);
  const savedIds = new Set(favorites?.map((f) => f.mountainId) ?? []);

  const peaks: ProgressPeak[] = (mountains ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    slug: toSlug(m.name),
    latitude: m.latitude,
    longitude: m.longitude,
    altitude: m.altitude,
    difficulty: m.difficulty,
    status: summitedIds.has(m.id) ? "summited" : savedIds.has(m.id) ? "saved" : "unvisited",
  }));

  const summitedCount = summitedIds.size;
  const savedCount = savedIds.size;
  const total = mountains?.length ?? 58;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />

      {/* Header */}
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, md: 4 }, pt: 4, pb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Progress Map
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All 58 Colorado 14ers — click any peak to view details
            </Typography>
          </Box>

          {/* Stats */}
          {accessToken && (
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Paper variant="outlined" sx={{ px: 2, py: 1, borderRadius: 3, display: "flex", alignItems: "center", gap: 1 }}>
                <EmojiEventsIcon sx={{ color: "#15803d", fontSize: "1.1rem" }} />
                <Typography variant="body2" fontWeight={700}>
                  {summitedCount} <Typography component="span" variant="caption" color="text.secondary">/ {total} summited</Typography>
                </Typography>
              </Paper>
              {savedCount > 0 && (
                <Paper variant="outlined" sx={{ px: 2, py: 1, borderRadius: 3, display: "flex", alignItems: "center", gap: 1 }}>
                  <StarIcon sx={{ color: "#f59e0b", fontSize: "1.1rem" }} />
                  <Typography variant="body2" fontWeight={700}>
                    {savedCount} <Typography component="span" variant="caption" color="text.secondary">saved</Typography>
                  </Typography>
                </Paper>
              )}
            </Stack>
          )}
        </Stack>

        {/* Legend */}
        <Stack direction="row" spacing={2} mt={2} flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <FiberManualRecordIcon sx={{ color: "#15803d", fontSize: "1rem" }} />
            <Typography variant="caption" color="text.secondary">Summited</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <FiberManualRecordIcon sx={{ color: "#f59e0b", fontSize: "1rem" }} />
            <Typography variant="caption" color="text.secondary">Saved</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <FiberManualRecordIcon sx={{ color: "#94a3b8", fontSize: "1rem" }} />
            <Typography variant="caption" color="text.secondary">Not yet visited</Typography>
          </Stack>
          {!accessToken && (
            <Chip
              label="Sign in to see your progress"
              size="small"
              component={NextLink}
              href="/login?redirect=/map"
              clickable
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>
      </Box>

      {/* Map */}
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, md: 4 }, pb: 2 }}>
        <Paper
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            height: { xs: "60vh", md: "72vh" },
            minHeight: 400,
          }}
        >
          {mtsLoading ? (
            <Skeleton variant="rounded" sx={{ height: "100%", width: "100%" }} />
          ) : (
            <ProgressMapInner peaks={peaks} />
          )}
        </Paper>
      </Box>

      {/* Completion progress bar */}
      {accessToken && total > 0 && (
        <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, md: 4 } }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TerrainIcon sx={{ color: "primary.main", fontSize: "1.1rem" }} />
                <Typography variant="body2" fontWeight={700}>Colorado 14er Challenge</Typography>
              </Stack>
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {summitedCount}/{total}
              </Typography>
            </Stack>
            <Box sx={{ height: 8, bgcolor: "action.hover", borderRadius: 4, overflow: "hidden" }}>
              <Box
                sx={{
                  height: "100%",
                  width: `${(summitedCount / total) * 100}%`,
                  bgcolor: summitedCount === total ? "success.main" : "primary.main",
                  borderRadius: 4,
                  transition: "width 0.5s ease",
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
              {summitedCount === total
                ? "🎉 You've completed the Colorado 14er Challenge!"
                : `${total - summitedCount} peaks remaining`}
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
