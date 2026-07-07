"use client";

import { useState, useEffect, useMemo } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import InputAdornment from "@mui/material/InputAdornment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SearchIcon from "@mui/icons-material/Search";
import TerrainIcon from "@mui/icons-material/Terrain";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";
import AppHeader from "@/components/AppHeader";

const RANGES = [
  { value: "", label: "All Ranges" },
  { value: "SAWATCH", label: "Sawatch Range" },
  { value: "ELK", label: "Elk Mountains" },
  { value: "SAN_JUAN", label: "San Juan Mountains" },
  { value: "TENMILE_MOSQUITO", label: "Tenmile / Mosquito" },
  { value: "FRONT", label: "Front Range" },
  { value: "SANGRE_DE_CRISTO", label: "Sangre de Cristo" },
  { value: "OTHER", label: "Other" },
];

const DIFFICULTIES = [
  { value: "", label: "All Difficulties" },
  { value: "CLASS_1", label: "Class 1" },
  { value: "CLASS_2", label: "Class 2" },
  { value: "CLASS_3", label: "Class 3" },
  { value: "CLASS_4", label: "Class 4" },
  { value: "CLASS_5", label: "Class 5" },
];

const SORTS = [
  { value: "altitude_desc", label: "Highest elevation" },
  { value: "altitude_asc", label: "Lowest elevation" },
  { value: "difficulty_asc", label: "Easiest first" },
  { value: "difficulty_desc", label: "Hardest first" },
  { value: "name_asc", label: "A → Z" },
];

const DIFFICULTY_ORDER: Record<string, number> = {
  CLASS_1: 1, CLASS_2: 2, CLASS_3: 3, CLASS_4: 4, CLASS_5: 5,
};

type RangeFilter = "SAWATCH" | "ELK" | "SAN_JUAN" | "TENMILE_MOSQUITO" | "FRONT" | "SANGRE_DE_CRISTO" | "OTHER";
type DifficultyFilter = "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5";
type StatusFilter = "all" | "unsummited" | "summited" | "saved";

export default function MountainsPage() {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [range, setRange] = useState<RangeFilter | "">("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter | "">("");
  const [sort, setSort] = useState("altitude_desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: mountains, isLoading } = trpc.mountain.list.useQuery({
    search: debouncedSearch || undefined,
    range: range || undefined,
    difficulty: difficulty || undefined,
  });

  const { data: completions } = trpc.user.completions.useQuery(undefined, { enabled: !!accessToken });
  const { data: favorites } = trpc.user.favorites.useQuery(undefined, { enabled: !!accessToken });

  const summitedIds = useMemo(() => new Set(completions?.map((c) => c.mountainId) ?? []), [completions]);
  const savedIds = useMemo(() => new Set(favorites?.map((f) => f.mountainId) ?? []), [favorites]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset status filter when user logs out
  useEffect(() => {
    if (!accessToken) setStatusFilter("all");
  }, [accessToken]);

  const filtered = useMemo(() => {
    if (!mountains) return [];
    let list = [...mountains];

    if (statusFilter === "summited") list = list.filter((m) => summitedIds.has(m.id));
    else if (statusFilter === "unsummited") list = list.filter((m) => !summitedIds.has(m.id));
    else if (statusFilter === "saved") list = list.filter((m) => savedIds.has(m.id));

    list.sort((a, b) => {
      switch (sort) {
        case "altitude_asc":  return a.altitude - b.altitude;
        case "difficulty_asc": return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        case "difficulty_desc": return DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty];
        case "name_asc": return a.name.localeCompare(b.name);
        default: return b.altitude - a.altitude;
      }
    });

    return list;
  }, [mountains, statusFilter, sort, summitedIds, savedIds]);

  const summitedCount = summitedIds.size;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 50%, #15803d 100%)",
          color: "white",
          py: { xs: 5, md: 8 },
          px: 3,
          textAlign: "center",
        }}
      >
        <TerrainIcon sx={{ fontSize: { xs: 44, md: 56 }, mb: 1, opacity: 0.9 }} />
        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ fontSize: { xs: "1.75rem", md: "3rem" } }}>
          Colorado 14ers
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.85, maxWidth: 500, mx: "auto", fontSize: { xs: "0.95rem", md: "1.25rem" } }}>
          {mountains ? `${filtered.length} of ${mountains.length} peaks` : "Explore all"} above 14,000 feet
        </Typography>
        {accessToken && summitedCount > 0 && (
          <Chip
            icon={<EmojiEventsIcon />}
            label={`${summitedCount}/58 summited`}
            sx={{ mt: 2, bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 700 }}
          />
        )}
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}>
        {/* Filters row */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
          <TextField
            placeholder="Search peaks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 2 }}
          />
          <TextField
            select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeFilter | "")}
            sx={{ flex: 1 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            {RANGES.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyFilter | "")}
            sx={{ flex: 1 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            {DIFFICULTIES.map((d) => (
              <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            {SORTS.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Status filter chips — only when logged in */}
        {accessToken && (
          <Stack direction="row" spacing={1} mb={3} flexWrap="wrap" useFlexGap>
            <ButtonGroup size="small" variant="outlined" sx={{ borderRadius: 3 }}>
              {([
                { key: "all", label: "All" },
                { key: "unsummited", label: "Unsummited" },
                { key: "summited", label: "✓ Summited", icon: <CheckCircleIcon sx={{ fontSize: "0.9rem" }} /> },
                { key: "saved", label: "★ Saved" },
              ] as { key: StatusFilter; label: string; icon?: React.ReactNode }[]).map(({ key, label, icon }) => (
                <Button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  startIcon={icon}
                  sx={{
                    fontWeight: statusFilter === key ? 700 : 400,
                    bgcolor: statusFilter === key ? "primary.main" : "transparent",
                    color: statusFilter === key ? "primary.contrastText" : "inherit",
                    "&:hover": { bgcolor: statusFilter === key ? "primary.dark" : "action.hover" },
                    borderRadius: "inherit",
                  }}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
            <Typography variant="caption" color="text.secondary" alignSelf="center">
              {filtered.length} peak{filtered.length !== 1 ? "s" : ""}
            </Typography>
          </Stack>
        )}

        {/* Grid */}
        <Grid container spacing={2}>
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rounded" height={180} />
                </Grid>
              ))
            : filtered.map((m) => {
                const summited = summitedIds.has(m.id);
                const saved = savedIds.has(m.id);
                return (
                  <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card
                      sx={{
                        height: "100%",
                        transition: "box-shadow 0.2s, transform 0.2s",
                        "&:hover": { boxShadow: 6, transform: "translateY(-2px)" },
                        ...(summited && { outline: "2px solid", outlineColor: "success.main" }),
                      }}
                    >
                      <CardActionArea
                        component={NextLink}
                        href={`/mountains/${m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                        sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}
                      >
                        {/* Elevation accent bar */}
                        <Box
                          sx={{
                            height: 6,
                            background: summited
                              ? "linear-gradient(90deg, #15803d, #22c55e)"
                              : "linear-gradient(90deg, #1d4ed8, #15803d)",
                            width: `${((m.altitude - 14000) / 440) * 100}%`,
                            minWidth: "10%",
                          }}
                        />
                        <CardContent sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                            <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.2, fontSize: { xs: "0.95rem", md: "1.25rem" } }}>
                              {m.name}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {summited && <CheckCircleIcon sx={{ color: "success.main", fontSize: "1rem" }} />}
                              {saved && !summited && <Typography sx={{ fontSize: "0.85rem" }}>★</Typography>}
                              <DifficultyChip difficulty={m.difficulty} />
                            </Stack>
                          </Box>

                          <RangeLabel range={m.range} sx={{ mb: 1.5 }} />

                          <Typography variant="h5" fontWeight={800} color="primary" sx={{ fontSize: { xs: "1.1rem", md: "1.5rem" } }}>
                            {m.altitude.toLocaleString()}
                            <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>{" "}ft</Typography>
                          </Typography>

                          {m.roundTripMiles && m.elevationGain && (
                            <Stack direction="row" spacing={2} mt={1.5}>
                              <Typography variant="body2" color="text.secondary">🥾 {m.roundTripMiles} mi</Typography>
                              <Typography variant="body2" color="text.secondary">↑ {m.elevationGain.toLocaleString()} ft gain</Typography>
                              {m.estimatedHours && (
                                <Typography variant="body2" color="text.secondary">⏱ {m.estimatedHours}h</Typography>
                              )}
                            </Stack>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
        </Grid>

        {!isLoading && filtered.length === 0 && (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <TerrainIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography color="text.secondary">No peaks match your filters.</Typography>
            {statusFilter !== "all" && (
              <Button size="small" sx={{ mt: 1.5 }} onClick={() => setStatusFilter("all")}>Clear status filter</Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
