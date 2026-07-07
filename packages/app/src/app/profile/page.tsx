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
import Tooltip from "@mui/material/Tooltip";
import ArticleIcon from "@mui/icons-material/Article";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LockIcon from "@mui/icons-material/Lock";
import LogoutIcon from "@mui/icons-material/Logout";
import MapIcon from "@mui/icons-material/Map";
import SettingsIcon from "@mui/icons-material/Settings";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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
      sx={{ p: { xs: 1.5, md: 2.5 }, textAlign: "center", borderRadius: 3, flex: "1 1 120px" }}
    >
      <Box sx={{ color: "primary.main", mb: 0.5, "& svg": { fontSize: { xs: "1.2rem", md: "1.5rem" } } }}>{icon}</Box>
      <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: "1.1rem", md: "1.5rem" } }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}>
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

// ── Stats tab ──────────────────────────────────────────────────────────────────

const RANGE_LABELS: Record<string, string> = {
  SAWATCH: "Sawatch", ELK: "Elk", SAN_JUAN: "San Juan",
  TENMILE_MOSQUITO: "Tenmile", FRONT: "Front", SANGRE_DE_CRISTO: "Sangre", OTHER: "Other",
};
const DIFF_LABELS: Record<string, string> = {
  CLASS_1: "C1", CLASS_2: "C2", CLASS_3: "C3", CLASS_4: "C4", CLASS_5: "C5",
};
const DIFF_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#f97316", "#ef4444"];
const CHART_BLUE = "#1d4ed8";

type Completion = {
  id: string;
  mountainId: string;
  completedAt: Date | string;
  mountain: { altitude: number; range: string; difficulty: string };
};

function StatsTab({ completions }: { completions: Completion[] }) {
  // Peaks by range
  const byRange = Object.entries(
    completions.reduce((acc, c) => {
      const key = c.mountain.range;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([range, count]) => ({ range: RANGE_LABELS[range] ?? range, count }))
    .sort((a, b) => b.count - a.count);

  // Peaks by difficulty
  const byDiff = ["CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5"].map((d, i) => ({
    name: DIFF_LABELS[d],
    value: completions.filter((c) => c.mountain.difficulty === d).length,
    color: DIFF_COLORS[i],
  })).filter((d) => d.value > 0);

  // Monthly activity (last 14 months)
  const now = new Date();
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const count = completions.filter((c) => {
      const cd = new Date(c.completedAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    return { label, count };
  });

  // Cumulative unique peaks over time
  const sorted = [...completions].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );
  const cumulative: { date: string; peaks: number }[] = [];
  const seen = new Set<string>();
  for (const c of sorted) {
    seen.add(c.mountainId);
    const last = cumulative[cumulative.length - 1];
    const dateStr = new Date(c.completedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (last?.date === dateStr) {
      last.peaks = seen.size;
    } else {
      cumulative.push({ date: dateStr, peaks: seen.size });
    }
  }

  const totalElevation = completions.reduce((s, c) => s + c.mountain.altitude, 0);
  const highestPeak = completions.reduce((max, c) => Math.max(max, c.mountain.altitude), 0);

  if (completions.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <TerrainIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
        <Typography color="text.secondary">Log summits to see your stats!</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Key numbers */}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Paper variant="outlined" sx={{ px: 2.5, py: 2, borderRadius: 3, flex: "1 1 140px", textAlign: "center" }}>
          <Typography variant="h5" fontWeight={800} color="primary.main">{completions.length}</Typography>
          <Typography variant="caption" color="text.secondary">Total summits (incl. repeats)</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2.5, py: 2, borderRadius: 3, flex: "1 1 140px", textAlign: "center" }}>
          <Typography variant="h5" fontWeight={800} color="success.main">{new Set(completions.map(c => c.mountainId)).size}</Typography>
          <Typography variant="caption" color="text.secondary">Unique peaks</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2.5, py: 2, borderRadius: 3, flex: "1 1 140px", textAlign: "center" }}>
          <Typography variant="h5" fontWeight={800} color="warning.main">{(totalElevation / 5280).toFixed(1)}mi</Typography>
          <Typography variant="caption" color="text.secondary">Total vertical (mi)</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2.5, py: 2, borderRadius: 3, flex: "1 1 140px", textAlign: "center" }}>
          <Typography variant="h5" fontWeight={800} color="secondary.main">{highestPeak.toLocaleString()}ft</Typography>
          <Typography variant="caption" color="text.secondary">Highest summit</Typography>
        </Paper>
      </Stack>

      {/* Monthly activity */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2}>Monthly Activity (last 12 months)</Typography>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip formatter={(v) => [`${v} summit${Number(v) !== 1 ? "s" : ""}`, ""]} />
            <Bar dataKey="count" fill={CHART_BLUE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Cumulative progress */}
      {cumulative.length > 1 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>Cumulative Unique Peaks</Typography>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={cumulative} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <ChartTooltip formatter={(v) => [`${v} peak${Number(v) !== 1 ? "s" : ""}`, ""]} />
              <Area type="monotone" dataKey="peaks" stroke={CHART_BLUE} strokeWidth={2} fill="url(#peakGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Range + Difficulty side by side */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>Peaks by Range</Typography>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byRange} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="range" tick={{ fontSize: 11 }} width={60} />
              <ChartTooltip formatter={(v) => [`${v} peak${Number(v) !== 1 ? "s" : ""}`, ""]} />
              <Bar dataKey="count" fill="#15803d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {byDiff.length > 0 && (
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={2}>Difficulty Breakdown</Typography>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={byDiff}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {byDiff.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip formatter={(v, name) => [`${v} peaks`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        )}
      </Stack>
    </Stack>
  );
}

// ── Achievement metadata ────────────────────────────────────────────────────────

const ALL_ACHIEVEMENTS = [
  { type: "FIRST_SUMMIT",               label: "First Summit",         desc: "Log your first summit",                    icon: <EmojiEventsIcon />, color: "#f59e0b" },
  { type: "TEN_SUMMITS",                label: "Ten Peaks",            desc: "Summit 10 unique mountains",               icon: <TerrainIcon />,     color: "#3b82f6" },
  { type: "TWENTY_FIVE_SUMMITS",        label: "Quarter Century",      desc: "Summit 25 unique mountains",               icon: <TerrainIcon />,     color: "#8b5cf6" },
  { type: "ALL_58",                     label: "Complete Bagger",      desc: "Summit all 58 Colorado 14ers!",            icon: <EmojiEventsIcon />, color: "#f59e0b" },
  { type: "HIGHEST_PEAK",               label: "Top of Colorado",      desc: "Summit Mount Elbert (14,440 ft)",          icon: <TerrainIcon />,     color: "#10b981" },
  { type: "CLASS_4_CLIMBER",            label: "Class 4 Climber",      desc: "Summit a Class 4 mountain",               icon: <TrendingUpIcon />,  color: "#f97316" },
  { type: "CLASS_5_CLIMBER",            label: "Technical Climber",    desc: "Summit a Class 5 mountain",               icon: <TrendingUpIcon />,  color: "#ef4444" },
  { type: "SAWATCH_COMPLETE",           label: "Sawatch Sweeper",      desc: "Complete all Sawatch Range peaks",         icon: <MapIcon />,         color: "#10b981" },
  { type: "ELK_COMPLETE",               label: "Elk Crusher",          desc: "Complete all Elk Mountains peaks",         icon: <MapIcon />,         color: "#10b981" },
  { type: "SAN_JUAN_COMPLETE",          label: "San Juan Slayer",      desc: "Complete all San Juan peaks",             icon: <MapIcon />,         color: "#10b981" },
  { type: "SANGRE_DE_CRISTO_COMPLETE",  label: "Sangre Conqueror",     desc: "Complete all Sangre de Cristo peaks",      icon: <MapIcon />,         color: "#10b981" },
  { type: "FRONT_COMPLETE",             label: "Front Runner",         desc: "Complete all Front Range peaks",          icon: <MapIcon />,         color: "#10b981" },
  { type: "TENMILE_MOSQUITO_COMPLETE",  label: "Tenmile Trekker",      desc: "Complete all Tenmile/Mosquito peaks",     icon: <MapIcon />,         color: "#10b981" },
] as const;

// ── Profile page ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { accessToken, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [editTarget, setEditTarget] = useState<Parameters<typeof EditCompletionDialog>[0]["completion"]>(null);

  const utils = trpc.useUtils();

  const { data: me, isLoading: meLoading } = trpc.user.me.useQuery(undefined, { enabled: !!accessToken });
  const { data: stats, isLoading: statsLoading } = trpc.user.stats.useQuery(undefined, { enabled: !!accessToken });
  const { data: completions, isLoading: completionsLoading } = trpc.user.completions.useQuery(undefined, { enabled: !!accessToken });
  const { data: favorites, isLoading: favoritesLoading } = trpc.user.favorites.useQuery(undefined, { enabled: !!accessToken });
  const { data: achievements } = trpc.user.achievements.useQuery(undefined, { enabled: !!accessToken });
  const { data: myReports, isLoading: reportsLoading } = trpc.tripReport.myReports.useQuery(undefined, { enabled: !!accessToken });

  const earnedTypes = new Set(achievements?.map((a) => a.type) ?? []);
  const earnedCount = earnedTypes.size;

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
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {isLoading ? (
              <>
                <Skeleton variant="text" width={200} height={40} sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
                <Skeleton variant="text" width={150} height={24} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
              </>
            ) : (
              <>
                <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.4rem", md: "2.125rem" } }}>
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
          {/* Action buttons */}
          <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}>
            <Button
              component={NextLink}
              href="/settings"
              size="small"
              startIcon={<SettingsIcon fontSize="small" />}
              sx={{
                color: "rgba(255,255,255,0.85)",
                borderColor: "rgba(255,255,255,0.3)",
                border: "1px solid",
                borderRadius: 2,
                textTransform: "none",
                px: 1.5,
                "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.6)" },
              }}
            >
              Settings
            </Button>
            <Button
              size="small"
              startIcon={<LogoutIcon fontSize="small" />}
              onClick={() => { logout(); router.push("/"); }}
              sx={{
                color: "rgba(255,255,255,0.75)",
                borderRadius: 2,
                textTransform: "none",
                px: 1.5,
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "white" },
              }}
            >
              Sign out
            </Button>
          </Stack>
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
            <Tab label="Stats" />
            <Tab label={`Achievements${earnedCount > 0 ? ` (${earnedCount})` : ""}`} />
            <Tab label={`Reports${myReports && myReports.length > 0 ? ` (${myReports.length})` : ""}`} />
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
                              href={`/mountains/${toSlug(c.mountain.name)}`}
                              fontWeight={600}
                              sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" }, fontSize: { xs: "0.875rem", md: "1rem" } }}
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

            {/* ── Tab 2: Stats ── */}
            {tab === 2 && (
              <StatsTab completions={completions ?? []} />
            )}

            {/* ── Tab 3: Achievements ── */}
            {tab === 3 && (
              <Box>
                {earnedCount === 0 && (
                  <Typography color="text.secondary" variant="body2" mb={2.5}>
                    Log summits to unlock achievements!
                  </Typography>
                )}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" },
                    gap: 2,
                  }}
                >
                  {ALL_ACHIEVEMENTS.map((a) => {
                    const unlocked = earnedTypes.has(a.type);
                    const unlockedAt = achievements?.find((u) => u.type === a.type)?.unlockedAt;
                    return (
                      <Tooltip
                        key={a.type}
                        title={unlocked ? (unlockedAt ? `Unlocked ${fmtDate(unlockedAt)}` : "Unlocked!") : a.desc}
                        arrow
                      >
                        <Paper
                          variant="outlined"
                          sx={{
                            p: { xs: 1.5, md: 2 },
                            borderRadius: 2,
                            textAlign: "center",
                            cursor: "default",
                            filter: unlocked ? "none" : "grayscale(1)",
                            opacity: unlocked ? 1 : 0.45,
                            borderColor: unlocked ? a.color : undefined,
                            transition: "opacity 0.2s",
                          }}
                        >
                          <Box sx={{ fontSize: "1.75rem", color: unlocked ? a.color : "text.disabled", mb: 0.5 }}>
                            {unlocked ? a.icon : <LockIcon sx={{ fontSize: "1.5rem" }} />}
                          </Box>
                          <Typography variant="caption" fontWeight={unlocked ? 700 : 400} display="block" lineHeight={1.2}>
                            {a.label}
                          </Typography>
                          {unlocked && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                              ✓ Earned
                            </Typography>
                          )}
                        </Paper>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
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
                          <CardActionArea component={NextLink} href={`/mountains/${toSlug(f.mountain.name)}`} sx={{ p: 2 }}>
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

            {/* ── Tab 4: Reports ── */}
            {tab === 4 && (
              <>
                {reportsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={110} sx={{ mb: 2, borderRadius: 2 }} />
                  ))
                ) : myReports?.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <ArticleIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>No trip reports yet</Typography>
                    <Typography color="text.secondary" mb={3}>
                      Visit a mountain page and write your first trip report.
                    </Typography>
                    <Button variant="contained" component={NextLink} href="/mountains">Browse 14ers</Button>
                  </Box>
                ) : (
                  <Stack divider={<Divider />} spacing={0}>
                    {myReports?.map((r) => {
                      const condColors: Record<string, string> = {
                        EXCELLENT: "#22c55e", GOOD: "#3b82f6", FAIR: "#f59e0b", POOR: "#ef4444",
                      };
                      return (
                        <Box key={r.id} sx={{ py: 2.5 }}>
                          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                            <ArticleIcon color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={0.25}>
                                <Typography
                                  component={NextLink}
                                  href={`/mountains/${toSlug(r.mountain.name)}`}
                                  fontWeight={600}
                                  variant="body2"
                                  sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                                >
                                  {r.mountain.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {r.mountain.altitude.toLocaleString()} ft
                                </Typography>
                                <DifficultyChip difficulty={r.mountain.difficulty} />
                                {r.conditions && (
                                  <Chip
                                    label={r.conditions.charAt(0) + r.conditions.slice(1).toLowerCase()}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: "0.68rem", borderColor: condColors[r.conditions], color: condColors[r.conditions] }}
                                  />
                                )}
                              </Stack>
                              <Typography variant="body2" fontWeight={600} mb={0.25}>{r.title}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {fmtDate(r.createdAt)}{r.trail ? ` · via ${r.trail.name}` : ""}
                                {!r.isPublic && " · Private"}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
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
