"use client";

import { use } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArticleIcon from "@mui/icons-material/Article";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import MapIcon from "@mui/icons-material/Map";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import HandshakeIcon from "@mui/icons-material/Handshake";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, textAlign: "center", borderRadius: 3, flex: "1 1 110px" }}>
      <Box sx={{ color: "primary.main", mb: 0.5, "& svg": { fontSize: { xs: "1.1rem", md: "1.4rem" } } }}>{icon}</Box>
      <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.65rem", md: "0.7rem" } }}>{label}</Typography>
    </Paper>
  );
}

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { accessToken, user: me } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading, isError } = trpc.user.publicProfile.useQuery({ userId });
  const { data: tripReports } = trpc.tripReport.byUser.useQuery({ userId }, { enabled: !!userId });
  const { data: publicLists } = trpc.list.byUser.useQuery({ userId }, { enabled: !!userId });
  const { data: followCounts } = trpc.user.followCounts.useQuery({ userId }, { enabled: !!userId });
  const { data: sharedSummits } = trpc.user.sharedSummits.useQuery(
    { userId },
    { enabled: !!accessToken && !!userId && me?.id !== userId }
  );
  const { data: followStatus } = trpc.user.isFollowing.useQuery(
    { userId },
    { enabled: !!accessToken && !!userId && me?.id !== userId }
  );

  const followMutation = trpc.user.follow.useMutation({
    onSuccess: () => {
      utils.user.isFollowing.invalidate({ userId });
      utils.user.followCounts.invalidate({ userId });
    },
  });
  const unfollowMutation = trpc.user.unfollow.useMutation({
    onSuccess: () => {
      utils.user.isFollowing.invalidate({ userId });
      utils.user.followCounts.invalidate({ userId });
    },
  });

  const isOwnProfile = !!me && me.id === userId;
  const isFollowing = followStatus?.isFollowing ?? false;

  if (isError) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <AppHeader />
        <Box sx={{ textAlign: "center", py: 12 }}>
          <LockIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h5" gutterBottom>Profile not found</Typography>
          <Button component={NextLink} href="/feed" startIcon={<ArrowBackIcon />}>Back to feed</Button>
        </Box>
      </Box>
    );
  }

  const { user, stats, recentCompletions, achievements } = data ?? {};

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #15803d 100%)",
          color: "white",
          pt: { xs: 5, md: 7 },
          pb: { xs: 8, md: 10 },
          px: 3,
        }}
      >
        <Box sx={{ maxWidth: 800, mx: "auto" }}>
          <Button
            component={NextLink}
            href="/feed"
            startIcon={<ArrowBackIcon />}
            sx={{ color: "rgba(255,255,255,0.75)", mb: 3, "&:hover": { color: "white" } }}
          >
            Back to feed
          </Button>
          <Stack direction="row" alignItems="center" spacing={2.5} flexWrap="wrap" useFlexGap>
            {isLoading ? (
              <Skeleton variant="circular" width={72} height={72} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
            ) : (
              <Avatar
                src={user?.avatar ?? undefined}
                sx={{ width: 72, height: 72, fontSize: 26, fontWeight: 700, bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
              >
                {!user?.avatar && initials(user?.name, user?.email ?? "")}
              </Avatar>
            )}
            <Box sx={{ flex: 1 }}>
              {isLoading ? (
                <>
                  <Skeleton variant="text" width={180} height={40} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
                  <Skeleton variant="text" width={120} height={24} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
                </>
              ) : (
                <>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.4rem", md: "2rem" } }}>
                    {user?.name ?? user?.email?.split("@")[0]}
                  </Typography>
                  {user?.bio && (
                    <Typography sx={{ opacity: 0.85, fontSize: "0.9rem", mt: 0.25, maxWidth: 420 }}>
                      {user.bio}
                    </Typography>
                  )}
                  <Typography sx={{ opacity: 0.7, fontSize: "0.875rem" }}>
                    Member since {user?.createdAt ? fmtDate(user.createdAt) : ""}
                  </Typography>
                  {followCounts && (
                    <Stack direction="row" spacing={2} mt={0.5}>
                      <Typography
                        component={NextLink}
                        href={`/users/${userId}/followers`}
                        variant="caption"
                        sx={{ opacity: 0.85, textDecoration: "none", color: "inherit", "&:hover": { opacity: 1, textDecoration: "underline" } }}
                      >
                        <strong>{followCounts.followers}</strong> followers
                      </Typography>
                      <Typography
                        component={NextLink}
                        href={`/users/${userId}/following`}
                        variant="caption"
                        sx={{ opacity: 0.85, textDecoration: "none", color: "inherit", "&:hover": { opacity: 1, textDecoration: "underline" } }}
                      >
                        <strong>{followCounts.following}</strong> following
                      </Typography>
                    </Stack>
                  )}
                </>
              )}
            </Box>
            {!isLoading && !isOwnProfile && accessToken && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button
                  variant={isFollowing ? "outlined" : "contained"}
                  size="small"
                  startIcon={isFollowing ? <PersonRemoveIcon /> : <PersonAddIcon />}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  onClick={() =>
                    isFollowing
                      ? unfollowMutation.mutate({ userId })
                      : followMutation.mutate({ userId })
                  }
                  sx={{
                    alignSelf: "center",
                    textTransform: "none",
                    borderRadius: 2,
                    ...(isFollowing
                      ? { color: "rgba(255,255,255,0.85)", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } }
                      : { bgcolor: "white", color: "primary.main", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" } }
                    ),
                  }}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
                <Button
                  component={NextLink}
                  href={`/compare/${userId}`}
                  variant="outlined"
                  size="small"
                  startIcon={<CompareArrowsIcon />}
                  sx={{
                    alignSelf: "center",
                    textTransform: "none",
                    borderRadius: 2,
                    color: "rgba(255,255,255,0.85)",
                    borderColor: "rgba(255,255,255,0.5)",
                    "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  Compare
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 800, mx: "auto", px: { xs: 2, md: 4 }, mt: -4 }}>
        {/* Stats */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={4}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={120} height={80} sx={{ borderRadius: 3 }} />
            ))
          ) : (
            <>
              <StatCard icon={<EmojiEventsIcon />} label="Total summits" value={stats?.totalSummits ?? 0} />
              <StatCard icon={<TerrainIcon />} label="Unique peaks" value={stats?.uniqueMountains ?? 0} />
              <StatCard
                icon={<TrendingUpIcon />}
                label="Highest peak"
                value={stats?.highestPeak ? `${stats.highestPeak.toLocaleString()} ft` : "—"}
              />
              <StatCard icon={<MapIcon />} label="Ranges covered" value={stats?.rangesCovered ?? 0} />
            </>
          )}
        </Stack>

        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: "1rem", md: "1.1rem" } }}>
              Achievements
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {achievements.map((a) => (
                <Chip
                  key={a.type}
                  icon={<EmojiEventsIcon />}
                  label={a.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  size="small"
                  sx={{ bgcolor: "warning.50", color: "warning.dark", fontWeight: 600, fontSize: "0.7rem" }}
                />
              ))}
            </Stack>
          </Paper>
        )}

        {/* Trip Reports */}
        {tripReports && tripReports.length > 0 && (
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: "1rem", md: "1.1rem" } }}>
              Trip Reports ({tripReports.length})
            </Typography>
            <Stack divider={<Divider />} spacing={0}>
              {tripReports.map((r) => {
                const condColors: Record<string, string> = {
                  EXCELLENT: "#22c55e", GOOD: "#3b82f6", FAIR: "#f59e0b", POOR: "#ef4444",
                };
                return (
                  <Box key={r.id} sx={{ py: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={0.5}>
                      <Typography
                        component={NextLink}
                        href={`/mountains/${toSlug(r.mountain.name)}`}
                        variant="body2"
                        fontWeight={600}
                        sx={{ textDecoration: "none", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                      >
                        {r.mountain.name}
                      </Typography>
                      {r.conditions && (
                        <Chip
                          label={r.conditions.charAt(0) + r.conditions.slice(1).toLowerCase()}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: "0.68rem", borderColor: condColors[r.conditions], color: condColors[r.conditions] }}
                        />
                      )}
                      <Typography variant="caption" color="text.disabled">{fmtDate(r.createdAt)}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <ArticleIcon sx={{ fontSize: "1rem", color: "text.disabled", mt: 0.25, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{r.title}</Typography>
                        {r.trail && (
                          <Typography variant="caption" color="text.secondary">via {r.trail.name}</Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        )}

        {/* Public lists */}
        {publicLists && publicLists.length > 0 && (
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <PlaylistAddCheckIcon color="primary" fontSize="small" />
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.1rem" } }}>
                Lists ({publicLists.length})
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {publicLists.map((lst) => (
                <Box
                  key={lst.id}
                  component={NextLink}
                  href={`/lists/${lst.id}`}
                  sx={{
                    display: "flex", alignItems: "center", gap: 2, py: 1.25, px: 1.5,
                    borderRadius: 2, textDecoration: "none", color: "inherit",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <PlaylistAddCheckIcon sx={{ color: "text.secondary", fontSize: "1.1rem", flexShrink: 0 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }} noWrap>{lst.name}</Typography>
                  <Chip label={`${lst._count.items} peak${lst._count.items !== 1 ? "s" : ""}`} size="small" variant="outlined" />
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Peaks in Common — only shown to logged-in users viewing someone else */}
        {sharedSummits && sharedSummits.length > 0 && (
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid", borderColor: "primary.light", bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(59,130,246,0.07)" : "rgba(59,130,246,0.04)" }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <HandshakeIcon sx={{ color: "primary.main", fontSize: "1.2rem" }} />
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.1rem" }, flex: 1 }}>
                Peaks in Common
              </Typography>
              <Chip label={sharedSummits.length} size="small" color="primary" />
            </Stack>
            <Stack divider={<Divider />} spacing={0}>
              {sharedSummits.map((m) => (
                <Box
                  key={m.id}
                  component={NextLink}
                  href={`/mountains/${toSlug(m.name)}`}
                  sx={{
                    py: 1.25,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    textDecoration: "none",
                    color: "inherit",
                    "&:hover .peak-name": { color: "primary.main" },
                  }}
                >
                  <TerrainIcon sx={{ color: "primary.main", fontSize: "1rem", flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography className="peak-name" variant="body2" fontWeight={600} noWrap sx={{ transition: "color 0.15s" }}>
                      {m.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.altitude.toLocaleString()} ft
                    </Typography>
                  </Box>
                  <DifficultyChip difficulty={m.difficulty as "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5"} size="small" />
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Summit log */}
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: "1rem", md: "1.1rem" } }}>
            Summit Log{recentCompletions ? ` (${recentCompletions.length})` : ""}
          </Typography>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1.5, borderRadius: 2 }} />
            ))
          ) : recentCompletions?.length === 0 ? (
            <Typography color="text.secondary" variant="body2" py={2} textAlign="center">
              No public summits yet.
            </Typography>
          ) : (
            <Stack divider={<Divider />} spacing={0}>
              {recentCompletions?.map((c) => (
                <Box key={c.id} sx={{ py: 2, display: "flex", gap: 2, alignItems: "center" }}>
                  <TerrainIcon color="primary" sx={{ flexShrink: 0, fontSize: "1.2rem" }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography
                        component={NextLink}
                        href={`/mountains/${toSlug(c.mountain.name)}`}
                        fontWeight={600}
                        variant="body2"
                        sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                      >
                        {c.mountain.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.mountain.altitude.toLocaleString()} ft
                      </Typography>
                      <DifficultyChip difficulty={c.mountain.difficulty} size="small" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {fmtDate(c.completedAt)}{c.trail ? ` · ${c.trail.name}` : ""}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
