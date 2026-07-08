"use client";

import { useState } from "react";
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
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import ArticleIcon from "@mui/icons-material/Article";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import PeopleIcon from "@mui/icons-material/People";
import StarIcon from "@mui/icons-material/Star";
import TerrainIcon from "@mui/icons-material/Terrain";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import { useAuth } from "@/lib/auth-context";
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

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardPanel() {
  const { data: board, isLoading } = trpc.feed.leaderboard.useQuery();

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      {isLoading
        ? Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Skeleton variant="circular" width={36} height={36} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="25%" />
                </Box>
              </Stack>
            </Box>
          ))
        : board?.map((entry) => (
            <Box
              key={entry.userId}
              component={NextLink}
              href={`/users/${entry.userId}`}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: 2.5,
                py: 2,
                textDecoration: "none",
                color: "inherit",
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: "none" },
                "&:hover": { bgcolor: "action.hover" },
                ...(entry.rank <= 3 && { bgcolor: entry.rank === 1 ? "warning.50" : "transparent" }),
              }}
            >
              <Typography sx={{ fontSize: entry.rank <= 3 ? "1.4rem" : "1rem", minWidth: 32, textAlign: "center", fontWeight: 700, color: "text.secondary" }}>
                {entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : `#${entry.rank}`}
              </Typography>
              <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, bgcolor: "primary.main" }}>
                {entry.name.slice(0, 2).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>{entry.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Highest: {entry.highestPeak.toLocaleString()} ft
                </Typography>
              </Box>
              <Stack alignItems="flex-end">
                <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ lineHeight: 1, fontSize: "1.1rem" }}>
                  {entry.uniquePeaks}
                </Typography>
                <Typography variant="caption" color="text.secondary">peaks</Typography>
              </Stack>
            </Box>
          ))}
      {!isLoading && (!board || board.length === 0) && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">No summit data yet.</Typography>
        </Box>
      )}
    </Paper>
  );
}

type FeedEvent = {
  id: string;
  type: "summit" | "review" | "report";
  date: Date | string;
  user: { id: string; name: string | null; email: string };
  mountain: { id: string; name: string; altitude: number; difficulty: string; slug: string };
  trail: { name: string } | null;
  rating: number | null;
  reportTitle: string | null;
  conditions: string | null;
};

function EventList({ events, isLoading, emptyMessage, emptyAction }: {
  events: FeedEvent[] | undefined;
  isLoading: boolean;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
}) {
  if (isLoading) {
    return (
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
    );
  }

  if (!events || events.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 5, borderRadius: 3, textAlign: "center" }}>
        <DynamicFeedIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
        <Typography variant="h6" gutterBottom>{emptyMessage}</Typography>
        {emptyAction}
      </Paper>
    );
  }

  return (
    <Stack divider={<Divider />} spacing={0}>
      {events.map((event) => (
        <Box key={event.id} sx={{ py: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: 13,
                fontWeight: 700,
                bgcolor: event.type === "summit" ? "primary.main" : event.type === "report" ? "info.main" : "secondary.main",
                flexShrink: 0,
              }}
            >
              {initials(event.user.name, event.user.email)}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={0.5}>
                <Typography
                  component={NextLink}
                  href={`/users/${event.user.id}`}
                  variant="body2"
                  fontWeight={700}
                  sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                >
                  {displayName(event.user.name, event.user.email)}
                </Typography>
                {event.type === "summit" ? (
                  <Chip
                    icon={<EmojiEventsIcon sx={{ fontSize: "0.85rem !important" }} />}
                    label="summited"
                    size="small"
                    sx={{ bgcolor: "success.50", color: "success.dark", fontWeight: 600, fontSize: "0.7rem", height: 20 }}
                  />
                ) : event.type === "report" ? (
                  <Chip
                    icon={<ArticleIcon sx={{ fontSize: "0.85rem !important" }} />}
                    label="trip report"
                    size="small"
                    sx={{ bgcolor: "info.50", color: "info.dark", fontWeight: 600, fontSize: "0.7rem", height: 20 }}
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

              {event.trail && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                  via {event.trail.name}
                </Typography>
              )}

              {event.type === "review" && event.rating !== null && (
                <Rating value={event.rating} readOnly size="small" sx={{ mt: 0.5 }} />
              )}

              {event.type === "report" && event.reportTitle && (
                <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.5}>
                  &ldquo;{event.reportTitle}&rdquo;
                </Typography>
              )}
            </Box>

            <TerrainIcon sx={{ color: "text.disabled", fontSize: "1.25rem", flexShrink: 0, mt: 0.25 }} />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function FollowingPanel() {
  const { data: events, isLoading } = trpc.feed.followingFeed.useQuery({ limit: 30 });

  return (
    <EventList
      events={events}
      isLoading={isLoading}
      emptyMessage="No activity from people you follow"
      emptyAction={
        <Typography color="text.secondary" variant="body2">
          Follow climbers from the leaderboard or their profiles to see their activity here.
        </Typography>
      }
    />
  );
}

export default function FeedPage() {
  const [tab, setTab] = useState(0);
  const { accessToken } = useAuth();
  const { data: events, isLoading } = trpc.feed.list.useQuery({ limit: 30 });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />

      <Box sx={{ maxWidth: 680, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <DynamicFeedIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={700}>Community</Typography>
            <Typography variant="body2" color="text.secondary">Recent activity and top summiteers</Typography>
          </Box>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
          <Tab icon={<DynamicFeedIcon fontSize="small" />} iconPosition="start" label="Activity" />
          {accessToken && <Tab icon={<PeopleIcon fontSize="small" />} iconPosition="start" label="Following" />}
          <Tab icon={<LeaderboardIcon fontSize="small" />} iconPosition="start" label="Leaderboard" />
        </Tabs>

        {/* Leaderboard is always the last tab; adjust index based on auth */}
        {tab === (accessToken ? 2 : 1) && <LeaderboardPanel />}
        {tab === 0 && (
          <EventList
            events={events}
            isLoading={isLoading}
            emptyMessage="No activity yet"
            emptyAction={
              <Button variant="contained" component={NextLink} href="/mountains">Browse 14ers</Button>
            }
          />
        )}
        {accessToken && tab === 1 && <FollowingPanel />}
      </Box>
    </Box>
  );
}
