"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { trpc } from "@/lib/trpc";
import { GpxParseError, matchMountains, parseGpx, type ParsedGpx } from "@/lib/gpxImport";
import { formatFeet, formatMiles, formatTrackDuration } from "@/lib/track";

type Row = {
  /** Stable across re-renders; the same file can legitimately be added twice. */
  key: string;
  fileName: string;
  parsed: ParsedGpx | null;
  /** Why this file can't be imported, when it can't. */
  error: string | null;
  mountainId: string;
  logSummit: boolean;
  isPublic: boolean;
  status: "ready" | "saving" | "done" | "failed";
  /** Where the imported track ended up, so the row can link to it. */
  trackId: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ImportGpxDialog({ open, onClose }: Props) {
  const utils = trpc.useUtils();
  const { data: mountains } = trpc.mountain.list.useQuery({}, { enabled: open });
  const { data: completions } = trpc.user.completions.useQuery(undefined, { enabled: open });

  /**
   * Summits already logged, by peak and day. Nothing stops a peak being climbed
   * twice, so the database can't reject a duplicate — but importing the GPX for
   * a hike you already logged by hand should not quietly double your count.
   */
  const loggedDays = useMemo(() => {
    const days = new Set<string>();
    for (const c of completions ?? []) {
      days.add(`${c.mountainId}|${new Date(c.completedAt).toDateString()}`);
    }
    return days;
  }, [completions]);

  const alreadyLogged = useCallback(
    (mountainId: string, on: Date) => loggedDays.has(`${mountainId}|${on.toDateString()}`),
    [loggedDays]
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const nextKey = useRef(0);

  const saveTrack = trpc.hikeTrack.save.useMutation();
  const logSummit = trpc.user.logSummit.useMutation();

  // Sorted for the dropdown; the match itself doesn't care about order.
  const mountainOptions = useMemo(
    () => [...(mountains ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [mountains]
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      const gpx = files.filter((f) => f.name.toLowerCase().endsWith(".gpx"));
      if (gpx.length === 0) return;

      setReading(true);
      const added: Row[] = [];

      for (const file of gpx) {
        const key = `f${nextKey.current++}`;
        try {
          const parsed = parseGpx(await file.text());
          // Best guess up front, correctable below — most imports should be a
          // glance and a click, not 58 dropdown entries to scroll.
          const best = matchMountains(parsed.points, mountains ?? [])[0];
          const duplicate = best ? alreadyLogged(best.mountain.id, parsed.endedAt) : false;
          added.push({
            key,
            fileName: file.name,
            parsed,
            error: null,
            mountainId: best?.mountain.id ?? "",
            logSummit: (best?.reachedSummit ?? false) && !duplicate,
            isPublic: true,
            status: "ready",
            trackId: null,
          });
        } catch (err) {
          added.push({
            key,
            fileName: file.name,
            parsed: null,
            error:
              err instanceof GpxParseError
                ? err.message
                : "This file couldn't be read as GPX.",
            mountainId: "",
            logSummit: false,
            isPublic: true,
            status: "failed",
            trackId: null,
          });
        }
      }

      setRows((prev) => [...prev, ...added]);
      setReading(false);
    },
    [mountains, alreadyLogged]
  );

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const importable = rows.filter((r) => r.status === "ready" && r.parsed && r.mountainId);

  async function handleImport() {
    setImporting(true);

    // One at a time: a dozen parallel writes of a 20,000-point array is a lot to
    // put on the connection at once, and a failure part-way through is easier to
    // read when the rows resolve in order.
    for (const row of importable) {
      if (!row.parsed) continue;
      patchRow(row.key, { status: "saving" });

      try {
        const track = await saveTrack.mutateAsync({
          mountainId: row.mountainId,
          startedAt: row.parsed.startedAt.toISOString(),
          endedAt: row.parsed.endedAt.toISOString(),
          durationSec: row.parsed.durationSec,
          distanceMeters: row.parsed.distanceMeters,
          points: row.parsed.points,
          isPublic: row.isPublic,
        });

        // `save` resolves to null when the peak no longer exists — a stale
        // dropdown rather than a failed write.
        if (!track) throw new Error("That peak no longer exists. Reload and try again.");

        if (row.logSummit) {
          await logSummit.mutateAsync({
            mountainId: row.mountainId,
            completedAt: row.parsed.endedAt.toISOString(),
            trackId: track.id,
            isPrivate: !row.isPublic,
          });
        }

        patchRow(row.key, { status: "done", trackId: track.id });
      } catch (err) {
        patchRow(row.key, {
          status: "failed",
          error: err instanceof Error ? err.message : "Import failed.",
        });
      }
    }

    setImporting(false);
    utils.hikeTrack.myTracks.invalidate();
    utils.user.completions.invalidate();
    utils.user.me.invalidate();
  }

  function handleClose() {
    if (importing) return;
    setRows([]);
    onClose();
  }

  const importedCount = rows.filter((r) => r.status === "done").length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Import hikes from GPX
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Export from Gaia, Strava, CalTopo or AllTrails and drop the files here
            </Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={importing} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(Array.from(e.dataTransfer.files));
          }}
          sx={{
            border: "2px dashed",
            borderColor: dragging ? "primary.main" : "divider",
            bgcolor: dragging ? "action.hover" : "transparent",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
            transition: "border-color 120ms, background-color 120ms",
          }}
        >
          {reading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <UploadFileIcon sx={{ fontSize: 32, color: "text.disabled", mb: 0.5 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Drop .gpx files here
              </Typography>
              <Button component="label" size="small" variant="outlined" sx={{ borderRadius: 2 }}>
                Choose files
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".gpx,application/gpx+xml"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    // Let the same file be picked again after it's cleared.
                    e.target.value = "";
                  }}
                />
              </Button>
            </>
          )}
        </Box>

        {rows.length > 0 && (
          <Stack divider={<Divider />} spacing={0} mt={2}>
            {rows.map((row) => (
              <ImportRow
                key={row.key}
                row={row}
                mountains={mountainOptions}
                alreadyLogged={alreadyLogged}
                disabled={importing}
                onChange={(patch) => patchRow(row.key, patch)}
                onRemove={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              />
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {importedCount > 0 && (
          <Typography variant="caption" color="success.main" sx={{ mr: "auto" }}>
            {importedCount} {importedCount === 1 ? "hike" : "hikes"} imported
          </Typography>
        )}
        <Button onClick={handleClose} disabled={importing}>
          {importedCount > 0 ? "Done" : "Cancel"}
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={importing || importable.length === 0}
          startIcon={importing ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ borderRadius: 2 }}
        >
          {importing
            ? "Importing…"
            : importable.length === 0
              ? "Import"
              : `Import ${importable.length} ${importable.length === 1 ? "hike" : "hikes"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── One file ──────────────────────────────────────────────────────────────────

function ImportRow({
  row,
  mountains,
  alreadyLogged,
  disabled,
  onChange,
  onRemove,
}: {
  row: Row;
  mountains: { id: string; name: string; latitude: number; longitude: number }[];
  alreadyLogged: (mountainId: string, on: Date) => boolean;
  disabled: boolean;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  // Recomputed here rather than stored, so correcting the peak by hand still
  // shows how far that peak was from the track.
  const match = useMemo(() => {
    if (!row.parsed || !row.mountainId) return null;
    const chosen = mountains.find((m) => m.id === row.mountainId);
    if (!chosen) return null;
    return matchMountains(row.parsed.points, [chosen])[0] ?? null;
  }, [row.parsed, row.mountainId, mountains]);

  if (!row.parsed) {
    return (
      <Box sx={{ py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <ErrorOutlineIcon color="error" sx={{ fontSize: "1.1rem", mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {row.fileName}
            </Typography>
            <Typography variant="caption" color="error.main">
              {row.error}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onRemove} disabled={disabled}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
    );
  }

  const { parsed } = row;
  const done = row.status === "done";
  const duplicate = !!row.mountainId && alreadyLogged(row.mountainId, parsed.endedAt);

  return (
    <Box sx={{ py: 1.75, opacity: done ? 0.65 : 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
        {done ? (
          <CheckCircleIcon color="success" sx={{ fontSize: "1.1rem" }} />
        ) : row.status === "saving" ? (
          <CircularProgress size={16} />
        ) : (
          <UploadFileIcon sx={{ fontSize: "1.1rem", color: "text.disabled" }} />
        )}
        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
          {parsed.name || row.fileName}
        </Typography>
        {!done && row.status !== "saving" && (
          <IconButton size="small" onClick={onRemove} disabled={disabled}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 3.5 }}>
        {parsed.startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        {" · "}
        {formatMiles(parsed.distanceMeters)}
        {" · "}
        {formatTrackDuration(parsed.durationSec)}
        {" · "}
        {parsed.points.length.toLocaleString()} pts
        {parsed.rawPointCount > parsed.points.length &&
          ` (thinned from ${parsed.rawPointCount.toLocaleString()})`}
      </Typography>

      {row.status === "failed" && row.error && (
        <Alert severity="error" sx={{ mt: 1, ml: 3.5, py: 0 }}>
          <Typography variant="caption">{row.error}</Typography>
        </Alert>
      )}

      {!done && row.status !== "failed" && (
        <Box sx={{ pl: 3.5, mt: 1 }}>
          <TextField
            select
            size="small"
            fullWidth
            label="Peak"
            value={row.mountainId}
            disabled={disabled || row.status === "saving"}
            onChange={(e) => {
              // Correcting the peak re-decides the summit box: the old answer
              // was about a different mountain.
              const chosen = mountains.find((m) => m.id === e.target.value);
              const reached = chosen
                ? (matchMountains(parsed.points, [chosen])[0]?.reachedSummit ?? false)
                : false;
              onChange({
                mountainId: e.target.value,
                logSummit: reached && !alreadyLogged(e.target.value, parsed.endedAt),
              });
            }}
            helperText={
              match
                ? match.reachedSummit
                  ? "The track reaches this summit"
                  : `Closest approach ${formatFeet(match.closestMeters)} from the summit`
                : row.mountainId
                  ? "This track doesn't go near that peak — check it's the right one"
                  : "No 14er near this track. Pick one to import it anyway."
            }
          >
            {mountains.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={row.logSummit}
                  disabled={disabled || !row.mountainId || row.status === "saving"}
                  onChange={(e) => onChange({ logSummit: e.target.checked })}
                />
              }
              label={<Typography variant="caption">Log a summit too</Typography>}
            />
            {duplicate && (
              <Typography variant="caption" color="warning.main">
                Already logged on this date
              </Typography>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!row.isPublic}
                  disabled={disabled || row.status === "saving"}
                  onChange={(e) => onChange({ isPublic: !e.target.checked })}
                />
              }
              label={<Typography variant="caption">Keep private</Typography>}
            />
          </Stack>
        </Box>
      )}

      {done && (
        <Box sx={{ pl: 3.5, mt: 0.5 }}>
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={row.logSummit ? "Track + summit saved" : "Track saved"}
            sx={{ height: 18, fontSize: "0.6rem" }}
          />
        </Box>
      )}
    </Box>
  );
}
