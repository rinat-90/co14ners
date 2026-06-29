"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
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
import SearchIcon from "@mui/icons-material/Search";
import TerrainIcon from "@mui/icons-material/Terrain";
import { trpc } from "@/lib/trpc";
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

type RangeFilter = "SAWATCH" | "ELK" | "SAN_JUAN" | "TENMILE_MOSQUITO" | "FRONT" | "SANGRE_DE_CRISTO" | "OTHER";
type DifficultyFilter = "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5";

export default function MountainsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [range, setRange] = useState<RangeFilter | "">("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter | "">("");

  const { data: mountains, isLoading } = trpc.mountain.list.useQuery({
    search: debouncedSearch || undefined,
    range: range || undefined,
    difficulty: difficulty || undefined,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
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
        <TerrainIcon sx={{ fontSize: 56, mb: 1, opacity: 0.9 }} />
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Colorado 14ers
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.85, maxWidth: 500, mx: "auto" }}>
          {mountains ? `${mountains.length} peaks` : "Explore all"} above 14,000 feet
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}>
        {/* Filters */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={4}>
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
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
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
              <MenuItem key={d.value} value={d.value}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Grid */}
        <Grid container spacing={2}>
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Skeleton variant="rounded" height={180} />
                </Grid>
              ))
            : mountains?.map((m) => (
                <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    sx={{
                      height: "100%",
                      transition: "box-shadow 0.2s, transform 0.2s",
                      "&:hover": { boxShadow: 6, transform: "translateY(-2px)" },
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
                          background: "linear-gradient(90deg, #1d4ed8, #15803d)",
                          width: `${((m.altitude - 14000) / 440) * 100}%`,
                          minWidth: "10%",
                        }}
                      />
                      <CardContent sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {m.name}
                          </Typography>
                          <DifficultyChip difficulty={m.difficulty} />
                        </Box>

                        <RangeLabel range={m.range} sx={{ mb: 1.5 }} />

                        <Typography variant="h5" fontWeight={800} color="primary">
                          {m.altitude.toLocaleString()}
                          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                            {" "}ft
                          </Typography>
                        </Typography>

                        {m.roundTripMiles && m.elevationGain && (
                          <Stack direction="row" spacing={2} mt={1.5}>
                            <Typography variant="body2" color="text.secondary">
                              🥾 {m.roundTripMiles} mi
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ↑ {m.elevationGain.toLocaleString()} ft gain
                            </Typography>
                            {m.estimatedHours && (
                              <Typography variant="body2" color="text.secondary">
                                ⏱ {m.estimatedHours}h
                              </Typography>
                            )}
                          </Stack>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
        </Grid>

        {!isLoading && mountains?.length === 0 && (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <TerrainIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography color="text.secondary">No peaks match your filters.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
