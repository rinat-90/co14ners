"use client";

import { use, useState } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BookmarkAddIcon from "@mui/icons-material/BookmarkAdd";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import NaturePeopleIcon from "@mui/icons-material/NaturePeople";
import RouteIcon from "@mui/icons-material/Route";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: "center", borderRadius: 3, flex: 1, minWidth: 120 }}>
      <Box sx={{ color: "primary.main", mb: 0.5 }}>{icon}</Box>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

// ── Log Summit dialog ──────────────────────────────────────────────────────────

function LogSummitDialog({
  open,
  onClose,
  mountainId,
  trails,
}: {
  open: boolean;
  onClose: () => void;
  mountainId: string;
  trails: { id: string; name: string }[];
}) {
  const utils = trpc.useUtils();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [trailId, setTrailId] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const logMutation = trpc.user.logSummit.useMutation({
    onSuccess: () => {
      utils.user.stats.invalidate();
      utils.user.completions.invalidate();
      utils.user.myCompletion.invalidate({ mountainId });
      utils.mountain.get.invalidate({ id: mountainId });
      setDate(today);
      setNotes("");
      setTrailId("");
      setIsPrivate(false);
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Log Summit</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Summit date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {trails.length > 0 && (
            <TextField
              label="Route (optional)"
              select
              value={trailId}
              onChange={(e) => setTrailId(e.target.value)}
              fullWidth
              slotProps={{ select: { native: true } }}
            >
              <option value="">No specific route</option>
              {trails.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </TextField>
          )}
          <TextField
            label="Notes"
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Trail conditions, weather, who you went with…"
            fullWidth
          />
          <FormControlLabel
            control={<Switch checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />}
            label="Private (only visible to you)"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!date || logMutation.isPending}
          onClick={() =>
            logMutation.mutate({
              mountainId,
              completedAt: new Date(date).toISOString(),
              notes: notes || undefined,
              trailId: trailId || undefined,
              isPrivate,
            })
          }
        >
          {logMutation.isPending ? "Saving…" : "Log Summit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MountainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const [logOpen, setLogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: mountain, isLoading, isError } = trpc.mountain.get.useQuery({ id });

  const { data: favData } = trpc.user.isFavorite.useQuery(
    { mountainId: id },
    { enabled: !!accessToken }
  );
  const { data: myCompletion } = trpc.user.myCompletion.useQuery(
    { mountainId: id },
    { enabled: !!accessToken }
  );

  const addFavMutation = trpc.user.addFavorite.useMutation({
    onSuccess: () => utils.user.isFavorite.invalidate({ mountainId: id }),
  });
  const removeFavMutation = trpc.user.removeFavorite.useMutation({
    onSuccess: () => utils.user.isFavorite.invalidate({ mountainId: id }),
  });

  const isFavorite = favData?.isFavorite ?? false;
  const favPending = addFavMutation.isPending || removeFavMutation.isPending;

  if (isError) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <AppHeader />
        <Box sx={{ textAlign: "center", py: 12 }}>
          <TerrainIcon sx={{ fontSize: 72, color: "text.disabled", mb: 2 }} />
          <Typography variant="h5" gutterBottom>Peak not found</Typography>
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
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h4" fontWeight={800} sx={{ opacity: 0.95 }}>
                  {mountain!.altitude.toLocaleString()} ft
                </Typography>

                {/* Logged badge */}
                {myCompletion && (
                  <Chip
                    icon={<EmojiEventsIcon />}
                    label="Summited"
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600 }}
                  />
                )}
              </Stack>

              {/* Action buttons */}
              {accessToken && (
                <Stack direction="row" spacing={1.5} mt={3}>
                  <Button
                    variant="contained"
                    startIcon={<EmojiEventsIcon />}
                    onClick={() => setLogOpen(true)}
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
                  >
                    {myCompletion ? "Log Again" : "Log Summit"}
                  </Button>
                  <Tooltip title={isFavorite ? "Remove from saved" : "Save peak"}>
                    <IconButton
                      disabled={favPending}
                      onClick={() =>
                        isFavorite
                          ? removeFavMutation.mutate({ mountainId: id })
                          : addFavMutation.mutate({ mountainId: id })
                      }
                      sx={{
                        color: "white",
                        bgcolor: isFavorite ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(4px)",
                        "&:hover": { bgcolor: isFavorite ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.3)" },
                      }}
                    >
                      {isFavorite ? <BookmarkAddedIcon /> : <BookmarkAddIcon />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
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
                <StatCard icon={<RouteIcon />} label="Round trip" value={`${mountain!.roundTripMiles} mi`} />
              )}
              {mountain!.elevationGain && (
                <StatCard icon={<TrendingUpIcon />} label="Elevation gain" value={`${mountain!.elevationGain.toLocaleString()} ft`} />
              )}
              {mountain!.estimatedHours && (
                <StatCard icon={<AccessTimeIcon />} label="Est. time" value={`${mountain!.estimatedHours} hrs`} />
              )}
              {mountain!.trailheadElevation && (
                <StatCard icon={<NaturePeopleIcon />} label="Trailhead elev." value={`${mountain!.trailheadElevation.toLocaleString()} ft`} />
              )}
              <StatCard icon={<MyLocationIcon />} label="Coordinates" value={`${mountain!.latitude.toFixed(4)}°N`} />
            </>
          )}
        </Stack>

        <Grid container spacing={3}>
          {/* Description */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>About</Typography>
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
                        <Typography variant="body2" color="text.secondary">{trail.description}</Typography>
                      )}
                      {(trail.roundTripMiles || trail.elevationGain) && (
                        <Stack direction="row" spacing={2} mt={0.5}>
                          {trail.roundTripMiles && (
                            <Typography variant="caption" color="text.secondary">🥾 {trail.roundTripMiles} mi</Typography>
                          )}
                          {trail.elevationGain && (
                            <Typography variant="caption" color="text.secondary">↑ {trail.elevationGain.toLocaleString()} ft</Typography>
                          )}
                          {trail.estimatedHours && (
                            <Typography variant="caption" color="text.secondary">⏱ {trail.estimatedHours}h</Typography>
                          )}
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* My latest summit note */}
            {myCompletion?.notes && (
              <Paper sx={{ p: 3, borderRadius: 3, mt: 3, borderLeft: 4, borderColor: "primary.main" }}>
                <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom>
                  Your Summit Note
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {myCompletion.notes}
                </Typography>
                <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                  Summited {new Date(myCompletion.completedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </Typography>
              </Paper>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Details</Typography>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="text" sx={{ mb: 1 }} />
                ))
              ) : (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Mountain Range</Typography>
                    <RangeLabel range={mountain!.range} sx={{ color: "text.primary", fontWeight: 600 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Difficulty</Typography>
                    <DifficultyChip difficulty={mountain!.difficulty} size="medium" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Summit Elevation</Typography>
                    <Typography fontWeight={600}>{mountain!.altitude.toLocaleString()} ft</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">GPS Coordinates</Typography>
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
                    <Chip label={`${mountain!._count.reviews} reviews`} variant="outlined" size="small" />
                    <Chip label={`${mountain!._count.favorites} saves`} variant="outlined" size="small" />
                  </Box>
                </Stack>
              )}
            </Paper>

            {!isLoading && (
              <>
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

                {!accessToken && (
                  <Button
                    fullWidth
                    variant="contained"
                    component={NextLink}
                    href="/login"
                    startIcon={<EmojiEventsIcon />}
                    sx={{ mt: 1.5, borderRadius: 3 }}
                  >
                    Sign in to log summit
                  </Button>
                )}
              </>
            )}
          </Grid>
        </Grid>

        <Box sx={{ pb: 6 }} />
      </Box>

      {mountain && (
        <LogSummitDialog
          open={logOpen}
          onClose={() => setLogOpen(false)}
          mountainId={id}
          trails={mountain.trails.map((t) => ({ id: t.id, name: t.name }))}
        />
      )}
    </Box>
  );
}
