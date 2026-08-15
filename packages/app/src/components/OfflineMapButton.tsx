"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import {
  boundsAround,
  countCached,
  downloadTiles,
  estimatedMegabytes,
  tilesForBounds,
  MAX_TILES,
  type TileCoord,
} from "@/lib/offlineTiles";

/** Treated as "you have this area" — a few missing tiles is a grey square, not a failure. */
const READY_FRACTION = 0.95;

type Props = {
  mountainLat: number;
  mountainLng: number;
  /** Trail geometry when the hiker has picked a route; falls back to the summit. */
  trailPositions?: [number, number][] | null;
};

export default function OfflineMapButton({ mountainLat, mountainLng, trailPositions }: Props) {
  const [tiles, setTiles] = useState<TileCoord[] | null>(null);
  const [cached, setCached] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // A picked trail tightens the box around the actual route; without one, pad
  // generously around the summit so the approach and trailhead are covered.
  useEffect(() => {
    const positions =
      trailPositions && trailPositions.length > 0
        ? trailPositions
        : ([[mountainLat, mountainLng]] as [number, number][]);
    const padding = trailPositions && trailPositions.length > 0 ? 0.02 : 0.08;

    const bounds = boundsAround(positions, padding);
    setTiles(bounds ? tilesForBounds(bounds) : null);
  }, [mountainLat, mountainLng, trailPositions]);

  // Report what is already stored, so a hiker who downloaded yesterday isn't
  // told to download again.
  useEffect(() => {
    if (!tiles) return;
    let active = true;
    countCached(tiles).then((n) => {
      if (active) setCached(n);
    });
    return () => {
      active = false;
    };
  }, [tiles]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleDownload = useCallback(async () => {
    if (!tiles) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ done: 0, total: tiles.length });

    const result = await downloadTiles(
      tiles,
      (p) => setProgress({ done: p.done, total: p.total }),
      controller.signal
    );

    setProgress(null);
    abortRef.current = null;
    if (!controller.signal.aborted) setCached(result.total - result.failed);
  }, [tiles]);

  if (!tiles || tiles.length === 0) return null;

  const tooMany = tiles.length > MAX_TILES;
  const isReady = cached !== null && cached >= tiles.length * READY_FRACTION;
  const downloading = progress !== null;

  return (
    <Paper
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 2.5,
        bgcolor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        color: "white",
        minWidth: 190,
      }}
    >
      {downloading ? (
        <Stack spacing={0.75}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={14} sx={{ color: "white" }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Saving map · {progress.done}/{progress.total}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={(progress.done / progress.total) * 100}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.2)",
              "& .MuiLinearProgress-bar": { bgcolor: "#22c55e" },
            }}
          />
          <Button
            size="small"
            onClick={() => abortRef.current?.abort()}
            sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", py: 0, minHeight: 0 }}
          >
            Cancel
          </Button>
        </Stack>
      ) : isReady ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CheckCircleIcon sx={{ fontSize: "1rem", color: "#22c55e" }} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block", lineHeight: 1.3 }}>
              Map saved for offline
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>
              Works without signal
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <CloudOffIcon sx={{ fontSize: "0.9rem", color: "#fbbf24" }} />
            <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.75)" }}>
              No signal above treeline
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="contained"
            startIcon={<CloudDownloadIcon />}
            onClick={handleDownload}
            disabled={tooMany}
            sx={{
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.95)",
              color: "#111",
              fontSize: "0.72rem",
              fontWeight: 700,
              "&:hover": { bgcolor: "white" },
            }}
          >
            {tooMany ? "Area too large" : `Save map (~${estimatedMegabytes(tiles.length).toFixed(0)} MB)`}
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
