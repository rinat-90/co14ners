"use client";

import { useState, useEffect, useRef } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import ArticleIcon from "@mui/icons-material/Article";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import TerrainIcon from "@mui/icons-material/Terrain";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import { trpc } from "@/lib/trpc";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function timeAgo(d: Date | string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

const RANGE_LABELS: Record<string, string> = {
  SAWATCH: "Sawatch", ELK: "Elk Mountains", SAN_JUAN: "San Juan",
  TENMILE_MOSQUITO: "Tenmile / Mosquito", FRONT: "Front Range",
  SANGRE_DE_CRISTO: "Sangre de Cristo", OTHER: "Other",
};

const CONDITIONS_META: Record<string, { label: string; color: string }> = {
  EXCELLENT: { label: "Excellent", color: "success" },
  GOOD:      { label: "Good",      color: "primary" },
  FAIR:      { label: "Fair",      color: "warning" },
  POOR:      { label: "Poor",      color: "error" },
};

const CONDITIONS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(CONDITIONS_META).map(([value, { label }]) => [value, label])
);

const DIFFICULTY_LABELS: Record<string, string> = {
  CLASS_1: "Class 1", CLASS_2: "Class 2", CLASS_3: "Class 3",
  CLASS_4: "Class 4", CLASS_5: "Class 5",
};

// ── Filter select — shared by the desktop row and the mobile bottom sheet ─────

function FilterSelect<T extends string>({
  label, emptyLabel, value, options, onChange, fullWidth, minWidth,
}: {
  label: string;
  emptyLabel: string;
  value: T;
  options: Record<string, string>;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  minWidth?: number;
}) {
  return (
    <FormControl size="small" fullWidth={fullWidth} sx={fullWidth ? undefined : { minWidth }}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={(e) => onChange(e.target.value as T)}>
        <MenuItem value="">{emptyLabel}</MenuItem>
        {Object.entries(options).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

// ── Report Card ───────────────────────────────────────────────────────────────

type Report = {
  id: string;
  title: string;
  body: string;
  photoUrl: string | null;
  conditions: string | null;
  createdAt: Date | string;
  user: { id: string; name: string | null; email: string; avatar: string | null };
  mountain: { id: string; name: string; altitude: number; difficulty: string; range: string };
  trail: { id: string; name: string } | null;
};

function ReportCard({ report }: { report: Report }) {
  const meta = report.conditions ? CONDITIONS_META[report.conditions] : null;

  return (
    <Paper
      component={NextLink}
      href={`/reports/${report.id}`}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "box-shadow 0.15s, transform 0.15s",
        "&:hover": { boxShadow: 6, transform: "translateY(-2px)" },
      }}
    >
      {/* Photo */}
      {report.photoUrl ? (
        <Box
          component="img"
          src={report.photoUrl}
          alt={report.title}
          sx={{ width: "100%", height: 180, objectFit: "cover", display: "block", bgcolor: "action.hover" }}
        />
      ) : (
        <Box
          sx={{
            height: 90,
            bgcolor: "action.hover",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArticleIcon sx={{ fontSize: 36, color: "text.disabled" }} />
        </Box>
      )}

      <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Mountain + chips */}
        <Stack direction="row" spacing={0.75} alignItems="center" mb={0.75} flexWrap="wrap" useFlexGap>
          <Typography
            variant="caption"
            fontWeight={700}
            color="primary.main"
            sx={{ "&:hover": { textDecoration: "underline" } }}
          >
            {report.mountain.name}
          </Typography>
          <Typography variant="caption" color="text.disabled">·</Typography>
          <DifficultyChip difficulty={report.mountain.difficulty as "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5"} size="small" />
          {meta && (
            <Chip
              label={meta.label}
              size="small"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              color={meta.color as any}
              sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
            />
          )}
        </Stack>

        {/* Title */}
        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3 }}>
          {report.title}
        </Typography>

        {/* Body preview */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
            mb: 1.5,
          }}
        >
          {report.body}
        </Typography>

        {/* Footer */}
        <Divider sx={{ mb: 1 }} />
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar
            src={report.user.avatar ?? undefined}
            sx={{ width: 22, height: 22, fontSize: 10, fontWeight: 700 }}
          >
            {!report.user.avatar && initials(report.user.name, report.user.email)}
          </Avatar>
          <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
            {report.user.name ?? report.user.email.split("@")[0]}
          </Typography>
          <Typography variant="caption" color="text.disabled" flexShrink={0}>
            {timeAgo(report.createdAt)}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Range = "" | "SAWATCH" | "ELK" | "SAN_JUAN" | "TENMILE_MOSQUITO" | "FRONT" | "SANGRE_DE_CRISTO" | "OTHER";
type Conditions = "" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
type Difficulty = "" | "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5";

export default function ReportsPage() {
  const [range, setRange] = useState<Range>("");
  const [conditions, setConditions] = useState<Conditions>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("");
  const [photoOnly, setPhotoOnly] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allItems, setAllItems] = useState<Report[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const prevCursorRef = useRef<string | undefined>(undefined);

  const { data, isLoading, isFetching } = trpc.tripReport.explore.useQuery({
    limit: 24,
    cursor,
    range: range || undefined,
    conditions: conditions || undefined,
    difficulty: difficulty || undefined,
    photoOnly,
  });

  useEffect(() => {
    if (!data) return;
    if (cursor && cursor === prevCursorRef.current) {
      setAllItems((prev) => [...prev, ...data.items as Report[]]);
    } else if (!cursor) {
      setAllItems(data.items as Report[]);
    }
    prevCursorRef.current = cursor;
    setInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleFilterChange = () => {
    setCursor(undefined);
    setAllItems([]);
    setInitialized(false);
  };

  const activeFilterCount =
    (range ? 1 : 0) + (conditions ? 1 : 0) + (difficulty ? 1 : 0) + (photoOnly ? 1 : 0);

  function clearAllFilters() {
    setRange("");
    setConditions("");
    setDifficulty("");
    setPhotoOnly(false);
    handleFilterChange();
  }

  const skeletonCount = 8;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap>
          <ArticleIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, flex: 1 }}>
            Trip Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {initialized && data ? `${allItems.length}${data.nextCursor ? "+" : ""} reports` : ""}
          </Typography>
        </Stack>

        {/* ── Desktop filters row ─────────────────────────────────────────────── */}
        <Paper sx={{ p: 2, borderRadius: 3, mb: 3, display: { xs: "none", sm: "block" } }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterListIcon sx={{ color: "text.secondary", fontSize: "1.1rem" }} />
              <Typography variant="body2" fontWeight={600} color="text.secondary">Filter</Typography>
            </Stack>

            <FilterSelect
              label="Range"
              emptyLabel="All ranges"
              value={range}
              options={RANGE_LABELS}
              onChange={(v: Range) => { setRange(v); handleFilterChange(); }}
              minWidth={150}
            />
            <FilterSelect
              label="Conditions"
              emptyLabel="Any conditions"
              value={conditions}
              options={CONDITIONS_LABELS}
              onChange={(v: Conditions) => { setConditions(v); handleFilterChange(); }}
              minWidth={140}
            />
            <FilterSelect
              label="Difficulty"
              emptyLabel="Any difficulty"
              value={difficulty}
              options={DIFFICULTY_LABELS}
              onChange={(v: Difficulty) => { setDifficulty(v); handleFilterChange(); }}
              minWidth={140}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={photoOnly}
                  onChange={(e) => { setPhotoOnly(e.target.checked); handleFilterChange(); }}
                />
              }
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CameraAltIcon sx={{ fontSize: "0.9rem" }} />
                  <Typography variant="body2">Photos only</Typography>
                </Stack>
              }
            />

            {activeFilterCount > 0 && (
              <Button size="small" variant="text" onClick={clearAllFilters}>
                Clear filters
              </Button>
            )}
          </Stack>
        </Paper>

        {/* ── Mobile filter button ────────────────────────────────────────────── */}
        <Box sx={{ display: { xs: "block", sm: "none" }, mb: activeFilterCount > 0 ? 1.5 : 3 }}>
          <Badge badgeContent={activeFilterCount} color="primary" invisible={activeFilterCount === 0} sx={{ width: "100%" }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterDrawerOpen(true)}
              sx={{ borderRadius: 2, justifyContent: "center" }}
            >
              Filters
            </Button>
          </Badge>
        </Box>

        {/* Active filters summary — mobile only */}
        {activeFilterCount > 0 && (
          <Stack direction="row" spacing={1} mb={3} flexWrap="wrap" useFlexGap sx={{ display: { xs: "flex", sm: "none" } }}>
            {range && (
              <Chip size="small" label={RANGE_LABELS[range]} onDelete={() => { setRange(""); handleFilterChange(); }} />
            )}
            {conditions && (
              <Chip
                size="small"
                label={CONDITIONS_LABELS[conditions]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                color={CONDITIONS_META[conditions].color as any}
                onDelete={() => { setConditions(""); handleFilterChange(); }}
              />
            )}
            {difficulty && (
              <Chip size="small" label={DIFFICULTY_LABELS[difficulty]} onDelete={() => { setDifficulty(""); handleFilterChange(); }} />
            )}
            {photoOnly && (
              <Chip size="small" icon={<CameraAltIcon />} label="Photos only" onDelete={() => { setPhotoOnly(false); handleFilterChange(); }} />
            )}
          </Stack>
        )}

        {/* ── Mobile filter bottom sheet ──────────────────────────────────────── */}
        <Drawer
          anchor="bottom"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, px: 2.5, pt: 1.5, pb: 4, maxHeight: "85vh" } } }}
        >
          {/* Handle */}
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mb: 2 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight={700}>Filters</Typography>
            <IconButton size="small" onClick={() => setFilterDrawerOpen(false)}><CloseIcon /></IconButton>
          </Stack>

          <Stack spacing={2}>
            <FilterSelect
              label="Range"
              emptyLabel="All ranges"
              value={range}
              options={RANGE_LABELS}
              onChange={(v: Range) => { setRange(v); handleFilterChange(); }}
              fullWidth
            />
            <FilterSelect
              label="Conditions"
              emptyLabel="Any conditions"
              value={conditions}
              options={CONDITIONS_LABELS}
              onChange={(v: Conditions) => { setConditions(v); handleFilterChange(); }}
              fullWidth
            />
            <FilterSelect
              label="Difficulty"
              emptyLabel="Any difficulty"
              value={difficulty}
              options={DIFFICULTY_LABELS}
              onChange={(v: Difficulty) => { setDifficulty(v); handleFilterChange(); }}
              fullWidth
            />

            <Divider />
            <FormControlLabel
              control={
                <Switch
                  checked={photoOnly}
                  onChange={(e) => { setPhotoOnly(e.target.checked); handleFilterChange(); }}
                />
              }
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CameraAltIcon sx={{ fontSize: "1rem" }} />
                  <Typography variant="body2">Photos only</Typography>
                </Stack>
              }
            />

            <Stack direction="row" spacing={1.5} pt={1}>
              {activeFilterCount > 0 && (
                <Button variant="outlined" fullWidth onClick={() => { clearAllFilters(); setFilterDrawerOpen(false); }}>
                  Clear all
                </Button>
              )}
              <Button variant="contained" fullWidth onClick={() => setFilterDrawerOpen(false)}>
                {isFetching
                  ? "Loading…"
                  : `Show ${allItems.length}${data?.nextCursor ? "+" : ""} report${allItems.length !== 1 ? "s" : ""}`}
              </Button>
            </Stack>
          </Stack>
        </Drawer>

        {/* Grid */}
        {isLoading && !initialized ? (
          <Grid container spacing={2}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Skeleton variant="rounded" sx={{ height: 320, borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : allItems.length === 0 ? (
          <Paper sx={{ py: 10, borderRadius: 3, textAlign: "center" }}>
            <ArticleIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={500}>No trip reports found</Typography>
            <Typography variant="body2" color="text.disabled" mt={0.5}>
              Try adjusting your filters
            </Typography>
          </Paper>
        ) : (
          <>
            <Grid container spacing={2}>
              {allItems.map((report) => (
                <Grid key={report.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <ReportCard report={report} />
                </Grid>
              ))}
              {isFetching && Array.from({ length: 4 }).map((_, i) => (
                <Grid key={`sk-${i}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Skeleton variant="rounded" sx={{ height: 320, borderRadius: 3 }} />
                </Grid>
              ))}
            </Grid>

            {data?.nextCursor && (
              <Box sx={{ textAlign: "center", mt: 4 }}>
                <Button
                  variant="outlined"
                  size="large"
                  disabled={isFetching}
                  onClick={() => setCursor(data.nextCursor!)}
                  sx={{ borderRadius: 3, px: 4 }}
                  startIcon={<TerrainIcon />}
                >
                  {isFetching ? "Loading…" : "Load more"}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
      <BottomNav />
    </Box>
  );
}
