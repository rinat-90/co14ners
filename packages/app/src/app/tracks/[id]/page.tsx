"use client";

import { use, useState } from "react";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import RouteIcon from "@mui/icons-material/Route";
import StraightenIcon from "@mui/icons-material/Straighten";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import TrackElevationProfile from "@/components/TrackElevationProfile";
import type { TrackMapProps } from "@/components/TrackMapInner";
import { trpc } from "@/lib/trpc";
import {
  downloadGPX,
  formatFeet,
  formatMiles,
  formatPace,
  formatTrackDuration,
  parseTrackPoints,
} from "@/lib/track";

// Leaflet needs browser APIs — never render it on the server.
const TrackMapInner = dynamic<TrackMapProps>(() => import("@/components/TrackMapInner"), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" sx={{ height: "100%", width: "100%" }} />,
});

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, textAlign: "center", flex: "1 1 90px" }}>
      <Box sx={{ color: "primary.main", "& svg": { fontSize: "1.1rem" } }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
        {label}
      </Typography>
    </Paper>
  );
}

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: track, isLoading } = trpc.hikeTrack.get.useQuery({ id });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const removeMutation = trpc.hikeTrack.remove.useMutation({
    onSuccess: () => {
      utils.hikeTrack.myTracks.invalidate();
      if (track) utils.hikeTrack.forMountain.invalidate({ mountainId: track.mountainId });
      router.push("/profile");
    },
  });

  const visibilityMutation = trpc.hikeTrack.setVisibility.useMutation({
    onSuccess: () => {
      utils.hikeTrack.get.invalidate({ id });
      utils.hikeTrack.myTracks.invalidate();
      if (track) utils.hikeTrack.forMountain.invalidate({ mountainId: track.mountainId });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
        <AppHeader />
        <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>
          <Skeleton variant="text" width={220} height={40} />
          <Skeleton variant="rounded" height={110} sx={{ my: 2, borderRadius: 3 }} />
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
        </Box>
        <BottomNav />
      </Box>
    );
  }

  if (!track) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
        <AppHeader />
        <Box sx={{ maxWidth: 560, mx: "auto", px: { xs: 2, md: 4 }, pt: 8, textAlign: "center" }}>
          <RouteIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Hike not found
          </Typography>
          <Typography color="text.secondary" mb={3}>
            This track was deleted, or its owner keeps it private.
          </Typography>
          <Button variant="contained" component={NextLink} href="/mountains">
            Browse 14ers
          </Button>
        </Box>
        <BottomNav />
      </Box>
    );
  }

  const points = parseTrackPoints(track.points);
  const slug = toSlug(track.mountain.name);
  const displayName = track.user.name ?? track.user.email.split("@")[0];
  const pace = formatPace(track.distanceMeters, track.durationSec);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />

      <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, md: 4 }, pt: 3 }}>
        <Button
          component={NextLink}
          href={`/mountains/${slug}`}
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ mb: 1.5, color: "text.secondary" }}
        >
          {track.mountain.name}
        </Button>

        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
          <Avatar
            component={NextLink}
            href={`/users/${track.user.id}`}
            src={track.user.avatar ?? undefined}
            sx={{ width: 44, height: 44, fontWeight: 700, textDecoration: "none" }}
          >
            {!track.user.avatar && initials(track.user.name, track.user.email)}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2} noWrap>
              {track.mountain.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {displayName} ·{" "}
              {new Date(track.startedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {track.trail && ` · ${track.trail.name}`}
            </Typography>
          </Box>
          {track.completionId && (
            <Tooltip title="A summit was logged from this hike">
              <Chip
                size="small"
                color="success"
                icon={<CheckCircleIcon />}
                label="Summited"
                sx={{ height: 22, fontSize: "0.68rem" }}
              />
            </Tooltip>
          )}
          {track.isOwner && !track.isPublic && (
            <Chip size="small" icon={<LockIcon />} label="Private" sx={{ height: 22, fontSize: "0.68rem" }} />
          )}
        </Stack>

        {/* Stats */}
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <StatTile
            icon={<AccessTimeIcon />}
            label="Moving time"
            value={formatTrackDuration(track.durationSec)}
          />
          <StatTile icon={<StraightenIcon />} label="Distance" value={formatMiles(track.distanceMeters)} />
          {track.gainMeters !== null && (
            <StatTile icon={<TrendingUpIcon />} label="Gain" value={formatFeet(track.gainMeters)} />
          )}
          {track.maxAltitudeMeters !== null && (
            <StatTile icon={<TerrainIcon />} label="High point" value={formatFeet(track.maxAltitudeMeters)} />
          )}
          {pace && <StatTile icon={<RouteIcon />} label="Avg pace" value={pace} />}
        </Stack>

        {/* Map */}
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", mb: 2 }}>
          <Box sx={{ height: { xs: 320, md: 420 } }}>
            {points.length > 1 ? (
              <TrackMapInner
                points={points}
                mountainLat={track.mountain.latitude}
                mountainLng={track.mountain.longitude}
              />
            ) : (
              <Stack alignItems="center" justifyContent="center" height="100%" spacing={1}>
                <RouteIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                <Typography variant="body2" color="text.secondary">
                  This hike has too few GPS points to draw.
                </Typography>
              </Stack>
            )}
          </Box>
        </Paper>

        {/* Elevation profile */}
        {points.length > 2 && (
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
              Elevation profile
            </Typography>
            <TrackElevationProfile points={points} />
            {track.pointCount < points.length && (
              <Typography variant="caption" color="text.secondary">
                Simplified for display.
              </Typography>
            )}
          </Paper>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            disabled={points.length < 2}
            onClick={() =>
              downloadGPX({
                name: `${track.mountain.name} hike`,
                startedAt: track.startedAt,
                points,
              })
            }
            sx={{ borderRadius: 2 }}
          >
            Export GPX
          </Button>

          {track.isOwner && !track.completionId && (
            <Button
              variant="contained"
              size="small"
              component={NextLink}
              href={`/mountains/${slug}?track=${track.id}`}
              sx={{ borderRadius: 2 }}
            >
              Log this summit
            </Button>
          )}

          {track.isOwner && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={track.isPublic ? <LockIcon /> : <PublicIcon />}
                disabled={visibilityMutation.isPending}
                onClick={() => visibilityMutation.mutate({ id: track.id, isPublic: !track.isPublic })}
                sx={{ borderRadius: 2 }}
              >
                {track.isPublic ? "Make private" : "Make public"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setConfirmDelete(true)}
                sx={{ borderRadius: 2 }}
              >
                Delete
              </Button>
            </>
          )}
        </Stack>

        {removeMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Couldn&apos;t delete this hike. Try again.
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="text.secondary">
          Recorded with the co14ners hike tracker · {track.pointCount.toLocaleString()} GPS points
        </Typography>
      </Box>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete this hike?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            The recorded route will be gone for good. Any summit you logged from it stays.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} color="inherit">
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={removeMutation.isPending}
            onClick={() => removeMutation.mutate({ id: track.id })}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <BottomNav />
    </Box>
  );
}
