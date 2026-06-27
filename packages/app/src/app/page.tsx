"use client";

import { useEffect } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TerrainIcon from "@mui/icons-material/Terrain";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExploreIcon from "@mui/icons-material/Explore";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import AppHeader from "@/components/AppHeader";

export default function HomePage() {
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();

  const { data: me } = trpc.user.me.useQuery(undefined, {
    enabled: !!accessToken,
    retry: false,
  });

  const { data: stats } = trpc.mountain.globalStats.useQuery();

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.push("/login");
    }
  }, [isLoading, accessToken, router]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const user = me;

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
        <TerrainIcon sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Welcome back{user?.name ? `, ${user.name}` : ""}!
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.85, mb: 4 }}>
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

      <Box sx={{ maxWidth: 800, mx: "auto", px: { xs: 2, md: 4 }, py: 6 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
          <Paper sx={{ p: 3, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <TerrainIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>
              {stats?.mountains ?? "—"}
            </Typography>
            <Typography color="text.secondary">Total 14ers</Typography>
            <Button component={NextLink} href="/mountains" size="small" sx={{ mt: 1.5 }}>
              View all peaks →
            </Button>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <EmojiEventsIcon sx={{ fontSize: 40, color: "secondary.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>
              {stats?.summits ?? "—"}
            </Typography>
            <Typography color="text.secondary">Summits logged</Typography>
            <Button component={NextLink} href="/mountains" size="small" sx={{ mt: 1.5 }}>
              Log a summit →
            </Button>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <ExploreIcon sx={{ fontSize: 40, color: "warning.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>
              {stats?.saves ?? "—"}
            </Typography>
            <Typography color="text.secondary">Saved peaks</Typography>
            <Button component={NextLink} href="/profile" size="small" sx={{ mt: 1.5 }}>
              View saved →
            </Button>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
