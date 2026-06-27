"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FavoriteIcon from "@mui/icons-material/Favorite";
import MapIcon from "@mui/icons-material/Map";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, textAlign: "center", borderRadius: 3, flex: "1 1 140px" }}
    >
      <Box sx={{ color: "primary.main", mb: 0.5 }}>{icon}</Box>
      <Typography variant="h5" fontWeight={800}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

// ── Edit completion dialog ─────────────────────────────────────────────────────

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  completion: { id: string; completedAt: Date | string } | null;
}

function EditCompletionDialog({ open, onClose, completion }: EditDialogProps) {
  const utils = trpc.useUtils();
  const [date, setDate] = useState("");

  const updateMutation = trpc.user.updateCompletion.useMutation({
    onSuccess: () => { utils.user.completions.invalidate(); onClose(); },
  });

  const handleOpen = () => {
    if (!completion) return;
    setDate(new Date(completion.completedAt).toISOString().slice(0, 10));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionProps={{ onEnter: handleOpen }}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle fontWeight={700}>Edit Summit Date</DialogTitle>
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
          <Typography variant="caption" color="text.secondary">
            To edit your review, visit the mountain page.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!date || updateMutation.isPending}
          onClick={() =>
            completion &&
            updateMutation.mutate({
              id: completion.id,
              completedAt: date ? new Date(date).toISOString() : undefined,
            })
          }
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Profile page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [editTarget, setEditTarget] = useState<Parameters<typeof EditCompletionDialog>[0]["completion"]>(null);

  const utils = trpc.useUtils();

  const { data: me, isLoading: meLoading } = trpc.user.me.useQuery(undefined, { enabled: !!accessToken });
  const { data: stats, isLoading: statsLoading } = trpc.user.stats.useQuery(undefined, { enabled: !!accessToken });
  const { data: completions, isLoading: completionsLoading } = trpc.user.completions.useQuery(undefined, { enabled: !!accessToken });
  const { data: favorites, isLoading: favoritesLoading } = trpc.user.favorites.useQuery(undefined, { enabled: !!accessToken });

  const deleteMutation = trpc.user.deleteCompletion.useMutation({
    onSuccess: () => utils.user.completions.invalidate(),
  });
  const unfavoriteMutation = trpc.user.removeFavorite.useMutation({
    onSuccess: () => utils.user.favorites.invalidate(),
  });

  if (!accessToken && typeof window !== "undefined") {
    router.push("/login");
    return null;
  }

  const isLoading = meLoading || statsLoading;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader />

      {/* Profile hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #15803d 100%)",
          color: "white",
          pt: { xs: 5, md: 7 },
          pb: { xs: 8, md: 10 },
          px: 3,
        }}
      >
        <Box sx={{ maxWidth: 900, mx: "auto", display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
          {isLoading ? (
            <Skeleton variant="circular" width={80} height={80} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
          ) : (
            <Avatar sx={{ width: 80, height: 80, fontSize: 28, fontWeight: 700, bgcolor: "rgba(255,255,255,0.2)", color: "white" }}>
              {initials(me?.name ?? null, me?.email ?? "")}
            </Avatar>
          )}
          <Box>
            {isLoading ? (
              <>
                <Skeleton variant="text" width={200} height={40} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
                <Skeleton variant="text" width={150} height={24} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
              </>
            ) : (
              <>
                <Typography variant="h4" fontWeight={700}>
                  {me?.name ?? me?.email}
                </Typography>
                {me?.name && (
                  <Typography sx={{ opacity: 0.8 }}>{me.email}</Typography>
                )}
                <Typography variant="caption" sx={{ opacity: 0.6 }}>
                  Member since {me?.createdAt ? fmtDate(me.createdAt) : ""}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 4 }, mt: -4 }}>
        {/* Stats row */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={4}>
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={140} height={96} sx={{ borderRadius: 3 }} />
            ))
          ) : (
            <>
              <StatCard icon={<EmojiEventsIcon />} label="Total summits" value={stats?.totalSummits ?? 0} />
              <StatCard icon={<TerrainIcon />} label="Unique peaks" value={stats?.uniqueMountains ?? 0} />
              <StatCard
                icon={<TrendingUpIcon />}
                label="Elevation gained"
                value={stats?.totalElevationGained ? `${stats.totalElevationGained.toLocaleString()} ft` : "0 ft"}
              />
              <StatCard icon={<MapIcon />} label="Ranges covered" value={stats?.rangesCovered ?? 0} />
              <StatCard icon={<FavoriteIcon />} label="Saved peaks" value={stats?.savedMountains ?? 0} />
            </>
          )}
        </Stack>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3, overflow: "hidden", mb: 4 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
            <Tab label={`Summits${stats ? ` (${stats.totalSummits})` : ""}`} />
            <Tab label={`Saved${stats ? ` (${stats.savedMountains})` : ""}`} />
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* ── Tab 0: Summits ── */}
            {tab === 0 && (
              <>
                {completionsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={90} sx={{ mb: 2, borderRadius: 2 }} />
                  ))
                ) : completions?.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <TerrainIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No summits yet
                    </Typography>
                    <Typography color="text.secondary" mb={3}>
                      Find a peak and log your first summit!
                    </Typography>
                    <Button variant="contained" component={NextLink} href="/mountains">
                      Browse 14ers
                    </Button>
                  </Box>
                ) : (
                  <Stack divider={<Divider />} spacing={0}>
                    {completions?.map((c) => (
                      <Box key={c.id} sx={{ py: 2.5, display: "flex", gap: 2, alignItems: "flex-start" }}>
                        <TerrainIcon color="primary" sx={{ mt: 0.5 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography
                              component={NextLink}
                              href={`/mountains/${c.mountain.id}`}
                              fontWeight={700}
                              sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                            >
                              {c.mountain.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {c.mountain.altitude.toLocaleString()} ft
                            </Typography>
                            <DifficultyChip difficulty={c.mountain.difficulty} />
                            {c.isPrivate && <Chip label="Private" size="small" sx={{ fontSize: 10 }} />}
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" mb={c.notes ? 1 : 0}>
                            Summited {fmtDate(c.completedAt)}
                            {c.trail && ` · ${c.trail.name}`}
                          </Typography>
                          {c.notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                              {c.notes}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setEditTarget({
                                id: c.id,
                                completedAt: c.completedAt,
                              })
                            }
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteMutation.mutate({ id: c.id })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </>
            )}

            {/* ── Tab 1: Saved ── */}
            {tab === 1 && (
              <>
                {favoritesLoading ? (
                  <Grid container spacing={2}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Grid key={i} size={{ xs: 12, sm: 6 }}>
                        <Skeleton variant="rounded" height={130} sx={{ borderRadius: 2 }} />
                      </Grid>
                    ))}
                  </Grid>
                ) : favorites?.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <FavoriteIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No saved peaks
                    </Typography>
                    <Typography color="text.secondary" mb={3}>
                      Bookmark mountains you want to climb.
                    </Typography>
                    <Button variant="contained" component={NextLink} href="/mountains">
                      Browse 14ers
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {favorites?.map((f) => (
                      <Grid key={f.id} size={{ xs: 12, sm: 6 }}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardActionArea component={NextLink} href={`/mountains/${f.mountain.id}`} sx={{ p: 2 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <Box>
                                <Typography fontWeight={700}>{f.mountain.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {f.mountain.altitude.toLocaleString()} ft
                                </Typography>
                                <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                                  <DifficultyChip difficulty={f.mountain.difficulty} />
                                  <RangeLabel range={f.mountain.range} />
                                </Stack>
                              </Box>
                              <TerrainIcon color="primary" />
                            </Box>
                            {(f.mountain.roundTripMiles || f.mountain.elevationGain) && (
                              <Stack direction="row" spacing={2} mt={1}>
                                {f.mountain.roundTripMiles && (
                                  <Typography variant="caption" color="text.secondary">
                                    🥾 {f.mountain.roundTripMiles} mi
                                  </Typography>
                                )}
                                {f.mountain.elevationGain && (
                                  <Typography variant="caption" color="text.secondary">
                                    ↑ {f.mountain.elevationGain.toLocaleString()} ft
                                  </Typography>
                                )}
                              </Stack>
                            )}
                          </CardActionArea>
                          <Box sx={{ px: 2, pb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<FavoriteIcon fontSize="small" />}
                              onClick={() => unfavoriteMutation.mutate({ mountainId: f.mountain.id })}
                            >
                              Remove
                            </Button>
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}
          </Box>
        </Paper>
      </Box>

      <EditCompletionDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        completion={editTarget}
      />
    </Box>
  );
}
