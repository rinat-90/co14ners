"use client";

import NextLink from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import TerrainIcon from "@mui/icons-material/Terrain";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExploreIcon from "@mui/icons-material/Explore";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";

export default function HomePage() {
  const { user } = useAuth();

  const { data: stats } = trpc.mountain.globalStats.useQuery();
  const { data: recommendations, isLoading: recsLoading } = trpc.recommendation.get.useQuery(
    undefined,
    { enabled: !!user }
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 50%, #15803d 100%)",
          color: "white",
          py: { xs: 6, md: 10 },
          px: 3,
          textAlign: "center",
        }}
      >
        <TerrainIcon sx={{ fontSize: { xs: 48, md: 64 }, mb: 2, opacity: 0.9 }} />
        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ fontSize: { xs: "1.75rem", md: "3rem" } }}>
          Welcome back{user?.name ? `, ${user.name}` : ""}!
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.85, mb: 4, fontSize: { xs: "0.95rem", md: "1.25rem" } }}>
          Track your Colorado 14er summits
        </Typography>
        <Button
          component={NextLink}
          href="/mountains"
          variant="contained"
          size="large"
          sx={{ bgcolor: "white", color: "primary.main", "&:hover": { bgcolor: "grey.100" }, px: 4 }}
          startIcon={<ExploreIcon />}
        >
          Explore 14ers
        </Button>
      </Box>

      {/* Global stats */}
      <Box sx={{ maxWidth: 800, mx: "auto", px: { xs: 2, md: 4 }, py: 6 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <TerrainIcon sx={{ fontSize: { xs: 32, md: 40 }, color: "primary.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" } }}>
              {stats?.mountains ?? "—"}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}>Total 14ers</Typography>
            <Button component={NextLink} href="/mountains" size="small" sx={{ mt: 1.5 }}>
              View all peaks →
            </Button>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <EmojiEventsIcon sx={{ fontSize: { xs: 32, md: 40 }, color: "secondary.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" } }}>
              {stats?.summits ?? "—"}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}>Summits logged</Typography>
            <Button component={NextLink} href="/mountains" size="small" sx={{ mt: 1.5 }}>
              Log a summit →
            </Button>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <ExploreIcon sx={{ fontSize: { xs: 32, md: 40 }, color: "warning.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" } }}>
              {stats?.saves ?? "—"}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}>Saved peaks</Typography>
            <Button component={NextLink} href="/profile" size="small" sx={{ mt: 1.5 }}>
              View saved →
            </Button>
          </Paper>
        </Stack>
      </Box>

      {/* Recommendations — only shown when logged in */}
      {user && (
        <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 4 }, pb: 8 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
            <LightbulbIcon sx={{ color: "warning.main" }} />
            <Typography variant="h6" fontWeight={700}>
              Peaks to Try Next
            </Typography>
          </Stack>

          {recsLoading ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={160} sx={{ borderRadius: 3 }} />
              ))}
            </Box>
          ) : recommendations && recommendations.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              {recommendations.map((rec) => (
                <Paper
                  key={rec.id}
                  component={NextLink}
                  href={`/mountains/${rec.slug}`}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    textDecoration: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    transition: "box-shadow 0.15s, border-color 0.15s",
                    "&:hover": {
                      boxShadow: 3,
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <Chip
                    label={rec.reason}
                    size="small"
                    sx={{
                      alignSelf: "flex-start",
                      bgcolor: "warning.main",
                      color: "warning.contrastText",
                      fontWeight: 600,
                      fontSize: "0.7rem",
                    }}
                  />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary" lineHeight={1.2}>
                    {rec.name}
                  </Typography>
                  <RangeLabel range={rec.range} sx={{ fontSize: "0.78rem" }} />
                  <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                    <DifficultyChip difficulty={rec.difficulty} size="small" />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {rec.altitude.toLocaleString()} ft
                    </Typography>
                  </Stack>
                  {rec.roundTripMiles && (
                    <Typography variant="caption" color="text.secondary">
                      {rec.roundTripMiles} mi · {rec.elevationGain ? `+${rec.elevationGain.toLocaleString()} ft gain` : ""}
                    </Typography>
                  )}
                  <Stack direction="row" justifyContent="flex-end" mt="auto" pt={0.5}>
                    <ArrowForwardIcon sx={{ fontSize: 16, color: "primary.main" }} />
                  </Stack>
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                Log your first summit to get personalized recommendations!
              </Typography>
              <Button component={NextLink} href="/mountains" size="small" sx={{ mt: 1.5 }}>
                Browse peaks →
              </Button>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}
