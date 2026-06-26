"use client";

import { use } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TerrainIcon from "@mui/icons-material/Terrain";
import RouteIcon from "@mui/icons-material/Route";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import NaturePeopleIcon from "@mui/icons-material/NaturePeople";
import { trpc } from "@/lib/trpc";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";
import AppHeader from "@/components/AppHeader";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, textAlign: "center", borderRadius: 3, flex: 1, minWidth: 120 }}
    >
      <Box sx={{ color: "primary.main", mb: 0.5 }}>{icon}</Box>
      <Typography variant="h6" fontWeight={700}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

export default function MountainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: mountain, isLoading, isError } = trpc.mountain.get.useQuery({ id });

  if (isError) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <AppHeader />
        <Box sx={{ textAlign: "center", py: 12 }}>
          <TerrainIcon sx={{ fontSize: 72, color: "text.disabled", mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Peak not found
          </Typography>
          <Button component={NextLink} href="/mountains" startIcon={<ArrowBackIcon />}>
            Back to all peaks
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #15803d 100%)",
          color: "white",
          pt: { xs: 4, md: 6 },
          pb: { xs: 6, md: 10 },
          px: 3,
          position: "relative",
        }}
      >
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Button
            component={NextLink}
            href="/mountains"
            startIcon={<ArrowBackIcon />}
            sx={{ color: "rgba(255,255,255,0.8)", mb: 3, "&:hover": { color: "white" } }}
          >
            All peaks
          </Button>

          {isLoading ? (
            <>
              <Skeleton variant="text" width={320} height={56} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
              <Skeleton variant="text" width={200} height={36} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
            </>
          ) : (
            <>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={1} flexWrap="wrap">
                <DifficultyChip difficulty={mountain!.difficulty} size="medium" />
                <RangeLabel range={mountain!.range} sx={{ color: "rgba(255,255,255,0.85)" }} />
              </Stack>
              <Typography variant="h2" fontWeight={700} gutterBottom>
                {mountain!.name}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ opacity: 0.95 }}>
                {mountain!.altitude.toLocaleString()} ft
              </Typography>
            </>
          )}
        </Box>
      </Box>

      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 4 }, mt: -4 }}>
        {/* Stats row */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={4}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={130} height={90} sx={{ borderRadius: 3 }} />
            ))
          ) : (
            <>
              {mountain!.roundTripMiles && (
                <StatCard
                  icon={<RouteIcon />}
                  label="Round trip"
                  value={`${mountain!.roundTripMiles} mi`}
                />
              )}
              {mountain!.elevationGain && (
                <StatCard
                  icon={<TrendingUpIcon />}
                  label="Elevation gain"
                  value={`${mountain!.elevationGain.toLocaleString()} ft`}
                />
              )}
              {mountain!.estimatedHours && (
                <StatCard
                  icon={<AccessTimeIcon />}
                  label="Est. time"
                  value={`${mountain!.estimatedHours} hrs`}
                />
              )}
              {mountain!.trailheadElevation && (
                <StatCard
                  icon={<NaturePeopleIcon />}
                  label="Trailhead elev."
                  value={`${mountain!.trailheadElevation.toLocaleString()} ft`}
                />
              )}
              <StatCard
                icon={<MyLocationIcon />}
                label="Coordinates"
                value={`${mountain!.latitude.toFixed(4)}°N`}
              />
            </>
          )}
        </Stack>

        <Grid container spacing={3}>
          {/* Description */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                About
              </Typography>
              {isLoading ? (
                <>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="70%" />
                </>
              ) : (
                <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {mountain!.description ?? "No description available."}
                </Typography>
              )}
            </Paper>

            {/* Trails */}
            {!isLoading && mountain!.trails.length > 0 && (
              <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Routes ({mountain!.trails.length})
                </Typography>
                <Stack divider={<Divider />} spacing={0}>
                  {mountain!.trails.map((trail) => (
                    <Box key={trail.id} sx={{ py: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                        <Typography fontWeight={600}>{trail.name}</Typography>
                        <DifficultyChip difficulty={trail.difficulty} />
                      </Box>
                      {trail.description && (
                        <Typography variant="body2" color="text.secondary">
                          {trail.description}
                        </Typography>
                      )}
                      {(trail.roundTripMiles || trail.elevationGain) && (
                        <Stack direction="row" spacing={2} mt={0.5}>
                          {trail.roundTripMiles && (
                            <Typography variant="caption" color="text.secondary">
                              🥾 {trail.roundTripMiles} mi
                            </Typography>
                          )}
                          {trail.elevationGain && (
                            <Typography variant="caption" color="text.secondary">
                              ↑ {trail.elevationGain.toLocaleString()} ft
                            </Typography>
                          )}
                          {trail.estimatedHours && (
                            <Typography variant="caption" color="text.secondary">
                              ⏱ {trail.estimatedHours}h
                            </Typography>
                          )}
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Details
              </Typography>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="text" sx={{ mb: 1 }} />
                ))
              ) : (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Mountain Range
                    </Typography>
                    <RangeLabel range={mountain!.range} sx={{ color: "text.primary", fontWeight: 600 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Difficulty
                    </Typography>
                    <DifficultyChip difficulty={mountain!.difficulty} size="medium" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Summit Elevation
                    </Typography>
                    <Typography fontWeight={600}>{mountain!.altitude.toLocaleString()} ft</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      GPS Coordinates
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {mountain!.latitude.toFixed(4)}°N, {Math.abs(mountain!.longitude).toFixed(4)}°W
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Chip
                      icon={<NaturePeopleIcon fontSize="small" />}
                      label={`${mountain!._count.completions} summits`}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`${mountain!._count.reviews} reviews`}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`${mountain!._count.favorites} saves`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Stack>
              )}
            </Paper>

            {/* Map link */}
            {!isLoading && (
              <Button
                fullWidth
                variant="outlined"
                href={`https://maps.google.com/?q=${mountain!.latitude},${mountain!.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<MyLocationIcon />}
                sx={{ mt: 2, borderRadius: 3 }}
              >
                Open in Google Maps
              </Button>
            )}
          </Grid>
        </Grid>

        <Box sx={{ pb: 6 }} />
      </Box>
    </Box>
  );
}
