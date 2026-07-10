"use client";

import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArticleIcon from "@mui/icons-material/Article";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExploreIcon from "@mui/icons-material/Explore";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import MapIcon from "@mui/icons-material/Map";
import PeopleIcon from "@mui/icons-material/People";
import StarIcon from "@mui/icons-material/Star";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";

const TOTAL_14ERS = 58;

function timeAgo(date: Date | string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function displayName(name: string | null | undefined, email: string) {
  return name ?? email.split("@")[0];
}

// ── Personal Progress Section ─────────────────────────────────────────────────

function ProgressSection() {
  const { data: stats, isLoading } = trpc.user.stats.useQuery();

  const unique = stats?.uniqueMountains ?? 0;
  const pct = Math.round((unique / TOTAL_14ERS) * 100);

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <TerrainIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>Your Challenge Progress</Typography>
        <Box sx={{ flex: 1 }} />
        <Button component={NextLink} href="/map" size="small" startIcon={<MapIcon />} sx={{ borderRadius: 2 }}>
          Map
        </Button>
      </Stack>

      {isLoading ? (
        <Skeleton variant="rounded" height={60} />
      ) : (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.75}>
            <Typography variant="h4" fontWeight={800} color="primary.main">
              {unique}
              <Typography component="span" variant="body1" color="text.secondary" fontWeight={400}> / {TOTAL_14ERS}</Typography>
            </Typography>
            <Typography variant="body2" fontWeight={700} color={pct === 100 ? "success.main" : "text.secondary"}>
              {pct}%{pct === 100 ? " 🏆 Complete!" : ""}
            </Typography>
          </Stack>
          <Tooltip title={`${unique} unique peaks summited out of ${TOTAL_14ERS}`}>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{ height: 10, borderRadius: 5, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 5 } }}
            />
          </Tooltip>

          <Stack
            direction="row"
            spacing={0}
            mt={2.5}
            divider={<Divider orientation="vertical" flexItem />}
            sx={{ "& > *": { flex: 1, textAlign: "center", px: 1 } }}
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>{stats?.totalSummits ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Total summits</Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {stats ? `${Math.round((stats.totalElevationGained ?? 0) / 1000)}k` : "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">ft gained</Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>{stats?.rangesCovered ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Ranges</Typography>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>{stats?.savedMountains ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Saved</Typography>
            </Box>
          </Stack>
        </>
      )}
    </Paper>
  );
}

// ── Mini Following Feed ────────────────────────────────────────────────────────

function MiniFollowingFeed() {
  const { data: events, isLoading } = trpc.feed.followingFeed.useQuery({ limit: 5 });

  if (!isLoading && (!events || events.length === 0)) return null;

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <PeopleIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>Following Activity</Typography>
        <Box sx={{ flex: 1 }} />
        <Button component={NextLink} href="/feed?tab=following" size="small" startIcon={<DynamicFeedIcon />} sx={{ borderRadius: 2 }}>
          See all
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Stack key={i} direction="row" spacing={1.5} alignItems="center">
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
              </Box>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Stack divider={<Divider />} spacing={0}>
          {events?.map((event) => (
            <Stack key={event.id} direction="row" spacing={1.5} alignItems="center" py={1.25}>
              <Avatar
                component={NextLink}
                href={`/users/${event.user.id}`}
                src={event.user.avatar ?? undefined}
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: event.type === "summit" ? "primary.main" : event.type === "report" ? "info.main" : "secondary.main",
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                {!event.user.avatar && displayName(event.user.name, event.user.email).slice(0, 2).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  <Typography
                    component={NextLink}
                    href={`/users/${event.user.id}`}
                    variant="body2"
                    fontWeight={700}
                    sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                  >
                    {displayName(event.user.name, event.user.email)}
                  </Typography>
                  {" "}
                  {event.type === "summit" ? "summited" : event.type === "report" ? "wrote a report on" : "reviewed"}{" "}
                  <Typography
                    component={NextLink}
                    href={`/mountains/${event.mountain.slug}`}
                    variant="body2"
                    fontWeight={600}
                    sx={{ textDecoration: "none", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                  >
                    {event.mountain.name}
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.disabled">{timeAgo(event.date)}</Typography>
              </Box>
              {event.type === "summit" ? (
                <EmojiEventsIcon sx={{ fontSize: "1rem", color: "success.main", flexShrink: 0 }} />
              ) : event.type === "report" ? (
                <ArticleIcon sx={{ fontSize: "1rem", color: "info.main", flexShrink: 0 }} />
              ) : (
                <StarIcon sx={{ fontSize: "1rem", color: "warning.main", flexShrink: 0 }} />
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

// ── Quick Links ───────────────────────────────────────────────────────────────

function QuickLinks() {
  const links = [
    { href: "/mountains", icon: <TerrainIcon />, label: "Browse 14ers" },
    { href: "/map", icon: <MapIcon />, label: "Progress Map" },
    { href: "/feed", icon: <DynamicFeedIcon />, label: "Activity Feed" },
    { href: "/stats", icon: <TrendingUpIcon />, label: "My Stats" },
  ];
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
      {links.map(({ href, icon, label }) => (
        <Button
          key={href}
          component={NextLink}
          href={href}
          variant="outlined"
          startIcon={icon}
          sx={{ borderRadius: 2, flex: { xs: "1 1 calc(50% - 12px)", sm: "0 0 auto" } }}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );
}

// ── Best Conditions Widget ────────────────────────────────────────────────────

const CONDITIONS_COLOR: Record<string, "success" | "info" | "warning" | "error"> = {
  Excellent: "success",
  Good: "info",
  Fair: "warning",
  Poor: "error",
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function BestConditionsWidget() {
  const { data: peaks, isLoading } = trpc.mountain.topConditions.useQuery({ limit: 5 });

  if (!isLoading && (!peaks || peaks.length === 0)) return null;

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <WbSunnyIcon sx={{ color: "warning.main" }} />
        <Typography variant="h6" fontWeight={700}>Best Conditions Now</Typography>
        <Box sx={{ flex: 1 }} />
        <Button component={NextLink} href="/mountains" size="small" sx={{ borderRadius: 2 }}>
          All peaks
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={44} />)}
        </Stack>
      ) : (
        <Stack divider={<Divider />} spacing={0}>
          {peaks!.map((peak) => (
            <Stack
              key={peak.id}
              component={NextLink}
              href={`/mountains/${toSlug(peak.name)}`}
              direction="row"
              alignItems="center"
              spacing={1.5}
              py={1.25}
              sx={{ textDecoration: "none", color: "inherit", "&:hover": { bgcolor: "action.hover" }, mx: -1, px: 1, borderRadius: 1 }}
            >
              <TerrainIcon sx={{ color: "primary.main", fontSize: "1.1rem", flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>{peak.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {peak.altitude.toLocaleString()} ft · {peak.conditions.count} report{peak.conditions.count !== 1 ? "s" : ""}
                </Typography>
              </Box>
              <Chip
                label={peak.conditions.label}
                size="small"
                color={CONDITIONS_COLOR[peak.conditions.label] ?? "default"}
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
              />
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

// ── Recommendations ───────────────────────────────────────────────────────────

function RecommendationsSection() {
  const { data: recommendations, isLoading } = trpc.recommendation.get.useQuery();
  if (!isLoading && (!recommendations || recommendations.length === 0)) return null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <LightbulbIcon sx={{ color: "warning.main" }} />
        <Typography variant="h6" fontWeight={700}>Peaks to Try Next</Typography>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={160} sx={{ borderRadius: 3 }} />)}
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2 }}>
          {recommendations!.map((rec) => (
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
                "&:hover": { boxShadow: 3, borderColor: "primary.main" },
              }}
            >
              <Chip
                label={rec.reason}
                size="small"
                sx={{ alignSelf: "flex-start", bgcolor: "warning.main", color: "warning.contrastText", fontWeight: 600, fontSize: "0.7rem" }}
              />
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" lineHeight={1.2}>{rec.name}</Typography>
              <RangeLabel range={rec.range} sx={{ fontSize: "0.78rem" }} />
              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                <DifficultyChip difficulty={rec.difficulty} size="small" />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{rec.altitude.toLocaleString()} ft</Typography>
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
      )}
    </Box>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();
  const { data: stats } = trpc.mountain.globalStats.useQuery();

  if (user) {
    // ── Logged-in dashboard ──────────────────────────────────────────────────
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 6 } }}>
        <AppHeader />

        {/* Compact hero */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 50%, #15803d 100%)",
            color: "white",
            py: { xs: 3, md: 5 },
            px: 3,
          }}
        >
          <Box sx={{ maxWidth: 900, mx: "auto" }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Welcome back{user.name ? `, ${user.name}` : ""}!
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Colorado 14er summit tracker
            </Typography>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 4 }, pt: 3 }}>
          <Stack spacing={3}>
            <QuickLinks />
            <ProgressSection />
            <MiniFollowingFeed />
            <BestConditionsWidget />
            <RecommendationsSection />
          </Stack>
        </Box>

        <BottomNav />
      </Box>
    );
  }

  // ── Logged-out landing ─────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 50%, #15803d 100%)",
          color: "white",
          py: { xs: 8, md: 12 },
          px: 3,
          textAlign: "center",
        }}
      >
        <TerrainIcon sx={{ fontSize: { xs: 56, md: 72 }, mb: 2, opacity: 0.9 }} />
        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ fontSize: { xs: "1.75rem", md: "3rem" } }}>
          Track Every Summit
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.85, mb: 4, fontSize: { xs: "0.95rem", md: "1.25rem" }, maxWidth: 480, mx: "auto" }}>
          Log your Colorado 14er summits, discover new peaks, and connect with fellow climbers.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
          <Button
            component={NextLink}
            href="/register"
            variant="contained"
            size="large"
            sx={{ bgcolor: "white", color: "primary.main", "&:hover": { bgcolor: "grey.100" }, px: 4 }}
          >
            Get Started Free
          </Button>
          <Button
            component={NextLink}
            href="/mountains"
            variant="outlined"
            size="large"
            startIcon={<ExploreIcon />}
            sx={{ borderColor: "rgba(255,255,255,0.6)", color: "white", "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" }, px: 4 }}
          >
            Explore 14ers
          </Button>
        </Stack>
      </Box>

      {/* Global stats */}
      <Box sx={{ maxWidth: 800, mx: "auto", px: { xs: 2, md: 4 }, py: 6 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <TerrainIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>{stats?.mountains ?? "—"}</Typography>
            <Typography color="text.secondary">Colorado 14ers</Typography>
            <Button component={NextLink} href="/mountains" size="small" sx={{ mt: 1.5 }}>View all peaks →</Button>
          </Paper>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <EmojiEventsIcon sx={{ fontSize: 40, color: "secondary.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>{stats?.summits ?? "—"}</Typography>
            <Typography color="text.secondary">Community summits</Typography>
            <Button component={NextLink} href="/feed" size="small" sx={{ mt: 1.5 }}>See activity →</Button>
          </Paper>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, flex: 1, textAlign: "center" }}>
            <PeopleIcon sx={{ fontSize: 40, color: "warning.main", mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>{stats?.saves ?? "—"}</Typography>
            <Typography color="text.secondary">Peaks on wishlists</Typography>
            <Button component={NextLink} href="/leaderboard" size="small" sx={{ mt: 1.5 }}>Leaderboard →</Button>
          </Paper>
        </Stack>

        {/* Conditions widget — shows real community data to logged-out visitors */}
        <Box mt={4}>
          <BestConditionsWidget />
        </Box>
      </Box>
    </Box>
  );
}
