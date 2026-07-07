"use client";

import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import StarIcon from "@mui/icons-material/Star";
import TerrainIcon from "@mui/icons-material/Terrain";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import { trpc } from "@/lib/trpc";

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function timeAgo(date: Date | string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function displayName(name: string | null | undefined, email: string) {
  return name ?? email.split("@")[0];
}

export default function FeedPage() {
  const { data: events, isLoading } = trpc.feed.list.useQuery({ limit: 30 });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />

      <Box sx={{ maxWidth: 680, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <DynamicFeedIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={700}>Activity Feed</Typography>
            <Typography variant="body2" color="text.secondary">Recent summits and reviews from the community</Typography>
          </Box>
        </Stack>

        {isLoading ? (
          <Stack spacing={2}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="25%" />
                  </Box>
                </Stack>
                <Skeleton variant="text" width="70%" />
              </Paper>
            ))}
          </Stack>
        ) : events?.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 5, borderRadius: 3, textAlign: "center" }}>
            <DynamicFeedIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" gutterBottom>No activity yet</Typography>
            <Typography color="text.secondary" mb={3}>
              Be the first to log a summit!
            </Typography>
            <Button variant="contained" component={NextLink} href="/mountains">
              Browse 14ers
            </Button>
          </Paper>
        ) : (
          <Stack divider={<Divider />} spacing={0}>
            {events?.map((event) => (
              <Box key={event.id} sx={{ py: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  {/* Avatar */}
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      fontSize: 13,
                      fontWeight: 700,
                      bgcolor: event.type === "summit" ? "primary.main" : "secondary.main",
                      flexShrink: 0,
                    }}
                  >
                    {initials(event.user.name, event.user.email)}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* Header row */}
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={0.5}>
                      <Typography variant="body2" fontWeight={700}>
                        {displayName(event.user.name, event.user.email)}
                      </Typography>
                      {event.type === "summit" ? (
                        <Chip
                          icon={<EmojiEventsIcon sx={{ fontSize: "0.85rem !important" }} />}
                          label="summited"
                          size="small"
                          sx={{ bgcolor: "success.50", color: "success.dark", fontWeight: 600, fontSize: "0.7rem", height: 20 }}
                        />
                      ) : (
                        <Chip
                          icon={<StarIcon sx={{ fontSize: "0.85rem !important" }} />}
                          label="reviewed"
                          size="small"
                          sx={{ bgcolor: "warning.50", color: "warning.dark", fontWeight: 600, fontSize: "0.7rem", height: 20 }}
                        />
                      )}
                      <Typography variant="caption" color="text.disabled">{timeAgo(event.date)}</Typography>
                    </Stack>

                    {/* Mountain link */}
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography
                        component={NextLink}
                        href={`/mountains/${event.mountain.slug}`}
                        variant="body2"
                        fontWeight={600}
                        sx={{ textDecoration: "none", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                      >
                        {event.mountain.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.mountain.altitude.toLocaleString()} ft
                      </Typography>
                      <DifficultyChip difficulty={event.mountain.difficulty as "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5"} size="small" />
                    </Stack>

                    {/* Trail (summit events) */}
                    {event.trail && (
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                        via {event.trail.name}
                      </Typography>
                    )}

                    {/* Rating (review events) */}
                    {event.type === "review" && event.rating !== null && (
                      <Rating value={event.rating} readOnly size="small" sx={{ mt: 0.5 }} />
                    )}
                  </Box>

                  {/* Mountain icon */}
                  <TerrainIcon sx={{ color: "text.disabled", fontSize: "1.25rem", flexShrink: 0, mt: 0.25 }} />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
