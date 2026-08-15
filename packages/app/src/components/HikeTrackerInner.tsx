"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import GpsNotFixedIcon from "@mui/icons-material/GpsNotFixed";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RouteIcon from "@mui/icons-material/Route";
import SaveIcon from "@mui/icons-material/Save";
import StopIcon from "@mui/icons-material/Stop";
import TerrainIcon from "@mui/icons-material/Terrain";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { downloadGPX, formatFeet, type TrackPoint } from "@/lib/track";
import OfflineMapButton from "@/components/OfflineMapButton";
import CloudOffIcon from "@mui/icons-material/CloudOff";

// ── Types ─────────────────────────────────────────────────────────────────────

type GpsPos = {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  timestamp: number;
};

type TrackingState = "idle" | "selecting" | "tracking" | "paused" | "stopped";

/**
 * Everything needed to rebuild an interrupted hike. Written to localStorage as
 * the hike happens: a phone that locks, backgrounds the tab and gets killed by
 * the OS is the normal case on a 12-hour day, and losing the whole track to it
 * would defeat the point of recording one.
 */
type TrackDraft = {
  mountainId: string;
  trailId: string | null;
  startedAt: number;
  updatedAt: number;
  elapsed: number;
  track: GpsPos[];
};

const DRAFT_KEY = "co14ners:hike-draft";
/** Rewrite the draft every this many new points rather than on each one. */
const DRAFT_EVERY_N_POINTS = 5;

export type HikeTrail = {
  id: string;
  name: string;
  difficulty: string;
  roundTripMiles: number | null;
  estimatedHours: number | null;
  geometry: unknown;
};

export type HikeTrackerProps = {
  mountainId: string;
  mountainLat: number;
  mountainLng: number;
  mountainName: string;
  mountainAltitude: number;
  mountainSlug: string;
  trails: HikeTrail[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineMeters(a: GpsPos, b: GpsPos): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(x));
}

function totalDistance(track: GpsPos[]): number {
  let dist = 0;
  for (let i = 1; i < track.length; i++) dist += haversineMeters(track[i - 1], track[i]);
  return dist;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  if (meters < 100) return `${Math.round(meters)}m`;
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)}m`;
  return `${miles.toFixed(2)}mi`;
}

/**
 * Cumulative ascent in metres. Phone GPS altitude swings by ten metres or more
 * while standing still, so a raw sum of positive deltas would invent thousands of
 * feet of gain over a day. Averaging first and only then counting rises that clear
 * the noise floor keeps a stationary hiker at zero.
 *
 * Must stay in step with `deriveElevation` on the API side, which recomputes this
 * on save — a live number that changes when the hike is stored reads as a bug.
 */
const ALTITUDE_NOISE_METERS = 8;
const SMOOTHING_WINDOW = 5;

function smoothAltitudes(altitudes: number[]): number[] {
  if (altitudes.length < SMOOTHING_WINDOW) return altitudes;

  const half = Math.floor(SMOOTHING_WINDOW / 2);
  const last = altitudes.length - 1;
  return altitudes.map((_, i) => {
    let sum = 0;
    for (let offset = -half; offset <= half; offset++) {
      sum += altitudes[Math.min(last, Math.max(0, i + offset))];
    }
    return sum / SMOOTHING_WINDOW;
  });
}

function cumulativeGain(track: GpsPos[]): number | null {
  const raw = track.map((p) => p.altitude).filter((a): a is number => a !== null);
  if (raw.length < 2) return null;

  const altitudes = smoothAltitudes(raw);

  let gain = 0;
  let reference = altitudes[0];
  for (const altitude of altitudes) {
    const delta = altitude - reference;
    if (delta > ALTITUDE_NOISE_METERS) {
      gain += delta;
      reference = altitude;
    } else if (delta < -ALTITUDE_NOISE_METERS) {
      reference = altitude;
    }
  }
  return Math.round(gain);
}

/** GPS fixes → the compact tuple format the API stores. */
function toWirePoints(track: GpsPos[], startedAt: number): TrackPoint[] {
  return track.map((p) => [
    p.lat,
    p.lng,
    p.altitude === null ? null : Math.round(p.altitude * 10) / 10,
    // Clamped: a device whose clock jumps backwards mid-hike would otherwise
    // produce a negative offset and get the whole track rejected.
    Math.max(0, Math.round((p.timestamp - startedAt) / 1000)),
  ]);
}

function readDraft(): TrackDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as TrackDraft;
    if (!draft?.mountainId || !Array.isArray(draft.track) || draft.track.length < 2) return null;
    return draft;
  } catch {
    return null;
  }
}

function writeDraft(draft: TrackDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Quota exceeded or storage disabled — recording continues either way, the
    // hike just isn't recoverable if the tab dies.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do; a stale draft is offered again rather than lost silently.
  }
}

/** Parse GeoJSON LineString geometry → Leaflet [lat, lng][] positions.
 *  GeoJSON coords are [longitude, latitude] — must be swapped for Leaflet. */
function parseTrailGeometry(geometry: unknown): [number, number][] | null {
  if (!geometry || typeof geometry !== "object") return null;
  const geo = geometry as { type?: string; coordinates?: [number, number][] };
  if (geo.type !== "LineString" || !Array.isArray(geo.coordinates)) return null;
  return geo.coordinates.map(([lon, lat]) => [lat, lon]);
}

const DIFF_COLORS: Record<string, string> = {
  CLASS_1: "#22c55e",
  CLASS_2: "#3b82f6",
  CLASS_3: "#f59e0b",
  CLASS_4: "#f97316",
  CLASS_5: "#ef4444",
};
const DIFF_LABELS: Record<string, string> = {
  CLASS_1: "Class 1",
  CLASS_2: "Class 2",
  CLASS_3: "Class 3",
  CLASS_4: "Class 4",
  CLASS_5: "Class 5",
};

// ── Leaflet icons ─────────────────────────────────────────────────────────────

function makeSummitIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:#1d4ed8;
      border:3px solid white;
      border-radius:50% 50% 0 50%;
      width:18px;height:18px;
      transform:rotate(45deg);
      box-shadow:0 2px 6px rgba(0,0,0,0.55);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 16],
    popupAnchor: [0, -20],
  });
}

function makeGpsIcon(state: TrackingState) {
  const color = state === "tracking" ? "#3b82f6" : state === "paused" ? "#f59e0b" : "#94a3b8";
  const pulse =
    state === "tracking"
      ? `<div style="position:absolute;top:-4px;left:-4px;width:20px;height:20px;border-radius:50%;background:${color};opacity:0.35;animation:gpsPulse 1.8s ease-out infinite"></div>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:12px;height:12px">
      ${pulse}
      <div style="position:absolute;top:0;left:0;background:${color};border:3px solid white;border-radius:50%;width:12px;height:12px;box-shadow:0 2px 6px rgba(0,0,0,0.55)"></div>
    </div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// ── MapController: pans map to GPS position ───────────────────────────────────

function MapController({ pos, follow }: { pos: GpsPos | null; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (pos && follow) {
      map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.6 });
    }
  }, [pos?.lat, pos?.lng, follow, map]);
  return null;
}

/** Fit map to show the full trail when a trail is selected. */
function TrailFitter({ positions }: { positions: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

// ── Trail selection dialog ────────────────────────────────────────────────────

function TrailSelectDialog({
  open,
  trails,
  selectedId,
  onSelect,
  onSkip,
}: {
  open: boolean;
  trails: HikeTrail[];
  selectedId: string | null;
  onSelect: (trail: HikeTrail) => void;
  onSkip: () => void;
}) {
  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          mx: 2,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
        },
      }}
    >
      <DialogTitle sx={{ color: "white", pb: 1, fontWeight: 700 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <RouteIcon sx={{ color: "#60a5fa" }} />
          <span>Choose a Trail</span>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 2 }}>
        <Stack spacing={1.5}>
          {trails.map((trail, i) => {
            const hasGeometry = !!parseTrailGeometry(trail.geometry);
            const isSelected = trail.id === selectedId;
            return (
              <Paper
                key={trail.id}
                onClick={() => onSelect(trail)}
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  bgcolor: isSelected ? "rgba(29,78,216,0.4)" : "rgba(255,255,255,0.06)",
                  border: "1px solid",
                  borderColor: isSelected ? "#3b82f6" : "rgba(255,255,255,0.1)",
                  transition: "all 0.15s",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.3)" },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: DIFF_COLORS[trail.difficulty] ?? "#94a3b8",
                      flexShrink: 0,
                    }}
                  />
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={700} color="white" noWrap>
                      {trail.name}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.25}>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                        {DIFF_LABELS[trail.difficulty] ?? trail.difficulty}
                      </Typography>
                      {trail.roundTripMiles && (
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                          · {trail.roundTripMiles} mi RT
                        </Typography>
                      )}
                      {trail.estimatedHours && (
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                          · ~{trail.estimatedHours}h
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                  {hasGeometry && (
                    <Chip
                      label="Map"
                      size="small"
                      icon={<RouteIcon sx={{ fontSize: "0.75rem !important" }} />}
                      sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(96,165,250,0.2)", color: "#93c5fd", border: "none" }}
                    />
                  )}
                  {isSelected && <CheckIcon sx={{ color: "#60a5fa", fontSize: "1.1rem", flexShrink: 0 }} />}
                </Stack>
              </Paper>
            );
          })}

          {trails.length > 0 && <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />}

          <Button
            variant="text"
            onClick={onSkip}
            startIcon={<DirectionsWalkIcon />}
            sx={{
              color: "rgba(255,255,255,0.55)",
              justifyContent: "flex-start",
              borderRadius: 2,
              px: 1,
              "&:hover": { color: "white", bgcolor: "rgba(255,255,255,0.08)" },
            }}
          >
            No specific trail — just track my route
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HikeTrackerInner({
  mountainId,
  mountainLat,
  mountainLng,
  mountainName,
  mountainAltitude,
  mountainSlug,
  trails,
}: HikeTrackerProps) {
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [selectedTrail, setSelectedTrail] = useState<HikeTrail | null>(null);
  const [currentPos, setCurrentPos] = useState<GpsPos | null>(null);
  const [track, setTrack] = useState<GpsPos[]>([]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  const [trailFitted, setTrailFitted] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [sharePublicly, setSharePublicly] = useState(true);
  const [savedTrackId, setSavedTrackId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrackDraft | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Shifted forward on resume so `elapsed` counts moving time only. */
  const startTimeRef = useRef<number>(0);
  /** True wall-clock start, never shifted — this is what the saved track uses. */
  const wallStartRef = useRef<number>(0);
  const endedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  /** Track length at the last draft write, so writes stay throttled. */
  const draftPointsRef = useRef<number>(0);

  const router = useRouter();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const saveMutation = trpc.hikeTrack.save.useMutation({
    onSuccess: (result) => {
      if (!result) {
        setSaveError("Couldn't save this hike — the peak it belongs to wasn't found.");
        return;
      }
      setSavedTrackId(result.id);
      setSaveOpen(false);
      setSaveError(null);
      // Saved server-side, so the local copy is no longer the only one.
      clearDraft();
      setDraft(null);
      utils.hikeTrack.myTracks.invalidate();
      utils.hikeTrack.forMountain.invalidate({ mountainId });
    },
    onError: (err) =>
      setSaveError(
        navigator.onLine
          ? err.message
          : "No signal — your hike is safe on this phone and will save itself once you reconnect."
      ),
  });

  // Watching connectivity lets the save dialog tell a lost hike apart from a
  // server error, and lets a failed save retry itself. Read in an effect rather
  // than at init so the server render and the first client render agree.
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Inject pulse animation CSS on mount
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "gps-pulse-style";
    style.textContent =
      "@keyframes gpsPulse { 0% { transform:scale(1); opacity:0.5 } 100% { transform:scale(3); opacity:0 } }";
    document.head.appendChild(style);
    return () => { document.getElementById("gps-pulse-style")?.remove(); };
  }, []);

  // ── GPS helpers ─────────────────────────────────────────────────────────────

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS not supported on this device.");
      return;
    }
    setGpsError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: GpsPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          timestamp: pos.timestamp,
        };
        setCurrentPos(newPos);
        setTrack((prev) => {
          if (prev.length > 0 && haversineMeters(prev[prev.length - 1], newPos) < 5) return prev;
          return [...prev, newPos];
        });
      },
      (err) => {
        if (err.code === 1) setGpsError("Location permission denied. Please enable GPS in your browser settings.");
        else if (err.code === 2) setGpsError("GPS signal unavailable. Move to an open area and try again.");
        else setGpsError("Unable to get your GPS location.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    return () => { stopWatching(); stopTimer(); };
  }, [stopWatching, stopTimer]);

  // ── Draft persistence ───────────────────────────────────────────────────────

  // Offer an interrupted hike back on load. A draft for a different peak is left
  // untouched so it can still be recovered from that peak's tracker page.
  useEffect(() => {
    const stored = readDraft();
    if (stored?.mountainId === mountainId) setDraft(stored);
  }, [mountainId]);

  // Mirror the running track to localStorage. Throttled by point count while
  // tracking, and written immediately on pause so a phone that dies while parked
  // still has the whole hike.
  useEffect(() => {
    if (trackingState !== "tracking" && trackingState !== "paused") return;
    if (track.length < 2) return;
    if (trackingState === "tracking" && track.length - draftPointsRef.current < DRAFT_EVERY_N_POINTS) {
      return;
    }
    draftPointsRef.current = track.length;
    writeDraft({
      mountainId,
      trailId: selectedTrail?.id ?? null,
      startedAt: wallStartRef.current,
      updatedAt: Date.now(),
      elapsed,
      track,
    });
  }, [track, trackingState, elapsed, mountainId, selectedTrail]);

  // ── Action handlers ─────────────────────────────────────────────────────────

  function beginTracking() {
    startTimeRef.current = Date.now();
    wallStartRef.current = Date.now();
    draftPointsRef.current = 0;
    setElapsed(0);
    setTrack([]);
    setCurrentPos(null);
    setGpsError(null);
    setFollowUser(true);
    setSavedTrackId(null);
    setSaveError(null);
    setTrackingState("tracking");
    startWatching();
    startTimer();
  }

  /** Pick a recovered hike back up where it left off. */
  function handleResumeDraft() {
    if (!draft) return;
    setTrack(draft.track);
    setElapsed(draft.elapsed);
    setSelectedTrail(trails.find((t) => t.id === draft.trailId) ?? null);
    setTrailFitted(true);
    wallStartRef.current = draft.startedAt;
    startTimeRef.current = Date.now() - draft.elapsed * 1000;
    draftPointsRef.current = draft.track.length;
    setDraft(null);
    setFollowUser(true);
    setTrackingState("tracking");
    startWatching();
    startTimer();
  }

  /** Load a recovered hike as a finished one, ready to save. */
  function handleReviewDraft() {
    if (!draft) return;
    setTrack(draft.track);
    setElapsed(draft.elapsed);
    setSelectedTrail(trails.find((t) => t.id === draft.trailId) ?? null);
    setTrailFitted(true);
    wallStartRef.current = draft.startedAt;
    endedAtRef.current = draft.updatedAt;
    draftPointsRef.current = draft.track.length;
    setDraft(null);
    setTrackingState("stopped");
    setSaveOpen(true);
  }

  function handleDiscardDraft() {
    clearDraft();
    setDraft(null);
  }

  function handleStartHike() {
    if (trails.length > 0) {
      setTrackingState("selecting");
    } else {
      beginTracking();
    }
  }

  function handleTrailSelect(trail: HikeTrail) {
    setSelectedTrail(trail);
    setTrailFitted(false);
    // Show trail on map first, then begin
    setTrackingState("tracking");
    beginTracking();
  }

  function handleSkipTrail() {
    setSelectedTrail(null);
    beginTracking();
  }

  function handlePause() {
    pausedAtRef.current = Date.now();
    setTrackingState("paused");
    stopWatching();
    stopTimer();
  }

  function handleResume() {
    const pauseDuration = Date.now() - pausedAtRef.current;
    startTimeRef.current += pauseDuration;
    setTrackingState("tracking");
    setFollowUser(true);
    startWatching();
    startTimer();
  }

  function handleFinish() {
    endedAtRef.current = Date.now();
    setTrackingState("stopped");
    stopWatching();
    stopTimer();
    // Straight into the save dialog — a recorded hike nobody was asked to keep
    // is a hike that gets lost.
    if (track.length >= 2 && user) setSaveOpen(true);
  }

  function handleNewTrack() {
    setTrackingState("idle");
    setSelectedTrail(null);
    setTrailFitted(false);
    setTrack([]);
    setCurrentPos(null);
    setElapsed(0);
    setSavedTrackId(null);
    setSaveError(null);
  }

  function handleSave() {
    setSaveError(null);
    saveMutation.mutate({
      mountainId,
      trailId: selectedTrail?.id,
      startedAt: new Date(wallStartRef.current).toISOString(),
      endedAt: new Date(endedAtRef.current || Date.now()).toISOString(),
      durationSec: elapsed,
      distanceMeters,
      points: toWirePoints(track, wallStartRef.current),
      isPublic: sharePublicly,
    });
  }

  // A hike that ends out of signal fails to save and keeps its local draft. Push
  // it the moment the phone reconnects — the hiker is usually driving home by
  // then and shouldn't have to come back to this screen and press Save again.
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    if (!isOnline || !saveError || savedTrackId) return;
    if (!user || saveMutation.isPending || track.length < 2) return;
    handleSaveRef.current();
  }, [isOnline, saveError, savedTrackId, user, saveMutation.isPending, track.length]);

  function handleExportGPX() {
    downloadGPX({
      name: `${mountainName} hike`,
      startedAt: new Date(wallStartRef.current),
      points: toWirePoints(track, wallStartRef.current),
    });
  }

  /** Log the summit against this track, so the log form arrives pre-filled. */
  function handleLogSummit() {
    router.push(
      savedTrackId
        ? `/mountains/${mountainSlug}?track=${savedTrackId}`
        : `/mountains/${mountainSlug}`
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const distanceMeters = totalDistance(track);
  const gainMeters = cumulativeGain(track);
  const trackPoints: [number, number][] = track.map((p) => [p.lat, p.lng]);
  const trailPositions = selectedTrail ? parseTrailGeometry(selectedTrail.geometry) : null;
  const summitIcon = makeSummitIcon();
  const gpsIcon = makeGpsIcon(trackingState);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Trail selection dialog */}
      <TrailSelectDialog
        open={trackingState === "selecting"}
        trails={trails}
        selectedId={selectedTrail?.id ?? null}
        onSelect={handleTrailSelect}
        onSkip={handleSkipTrail}
      />

      {/* Recovered hike from an interrupted session */}
      {draft && trackingState === "idle" && (
        <Box sx={{ position: "absolute", top: 72, left: 16, right: 16, zIndex: 1100 }}>
          <Alert
            severity="info"
            icon={<RouteIcon />}
            sx={{ borderRadius: 2, alignItems: "center" }}
            action={
              <Stack direction="row" spacing={0.5}>
                <Button size="small" onClick={handleResumeDraft}>Continue</Button>
                <Button size="small" onClick={handleReviewDraft}>Save</Button>
                <Button size="small" color="inherit" onClick={handleDiscardDraft}>Discard</Button>
              </Stack>
            }
          >
            Unfinished hike from {new Date(draft.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            {" · "}{formatDistance(totalDistance(draft.track))} · {formatDuration(draft.elapsed)}
          </Alert>
        </Box>
      )}

      {/* Save dialog */}
      <Dialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle fontWeight={700}>Save this hike</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TerrainIcon color="primary" />
              <Typography variant="body2" fontWeight={600}>
                {mountainName}
                {selectedTrail && (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {" · "}{selectedTrail.name}
                  </Typography>
                )}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`⏱ ${formatDuration(elapsed)}`} />
              <Chip size="small" label={`📏 ${formatDistance(distanceMeters)}`} />
              {gainMeters !== null && gainMeters > 0 && (
                <Chip size="small" label={`⛰ ${formatFeet(gainMeters)} gain`} />
              )}
              <Chip size="small" label={`${track.length} pts`} />
            </Stack>

            <FormControlLabel
              control={
                <Switch checked={sharePublicly} onChange={(e) => setSharePublicly(e.target.checked)} />
              }
              label={
                <Typography variant="body2">
                  Share this route publicly
                  <Typography variant="caption" display="block" color="text.secondary">
                    {sharePublicly
                      ? "Other climbers will see it on this peak's page."
                      : "Only you will be able to see it."}
                  </Typography>
                </Typography>
              }
            />

            {saveError && (
              // Offline isn't an error the hiker can act on — the retry is automatic.
              <Alert severity={isOnline ? "error" : "info"} icon={isOnline ? undefined : <CloudOffIcon />}>
                {saveError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)} color="inherit">
            Not now
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          >
            {saveMutation.isPending ? "Saving…" : "Save hike"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Map */}
      <MapContainer
        center={[mountainLat, mountainLng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='Map: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          maxZoom={17}
        />

        {/* Trail route (selected trail's GPS geometry — blue) */}
        {trailPositions && trailPositions.length > 1 && (
          <Polyline
            positions={trailPositions}
            color="#60a5fa"
            weight={4}
            opacity={0.85}
            dashArray={trackingState === "idle" || trackingState === "selecting" ? "8 4" : undefined}
          />
        )}

        {/* Summit marker */}
        <Marker position={[mountainLat, mountainLng]} icon={summitIcon} />

        {/* Recorded GPS track (orange — user's actual path) */}
        {trackPoints.length > 1 && (
          <Polyline positions={trackPoints} color="#f97316" weight={4} opacity={0.9} />
        )}

        {/* GPS accuracy circle */}
        {currentPos && (
          <Circle
            center={[currentPos.lat, currentPos.lng]}
            radius={currentPos.accuracy}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 1 }}
          />
        )}

        {/* GPS position dot */}
        {currentPos && (
          <Marker position={[currentPos.lat, currentPos.lng]} icon={gpsIcon} />
        )}

        <MapController pos={currentPos} follow={trackingState === "tracking" && followUser} />
        {trailPositions && !trailFitted && (
          <TrailFitter positions={trailPositions} />
        )}
      </MapContainer>

      {/* GPS error */}
      {gpsError && (
        <Box sx={{ position: "absolute", top: 16, left: 16, right: 16, zIndex: 1100 }}>
          <Alert severity="error" onClose={() => setGpsError(null)} sx={{ borderRadius: 2 }}>
            {gpsError}
          </Alert>
        </Box>
      )}

      {/* Selected trail pill (top-left, below top overlay) */}
      {selectedTrail && trackingState !== "idle" && trackingState !== "selecting" && (
        <Box sx={{ position: "absolute", top: 72, left: 16, zIndex: 1000 }}>
          <Chip
            icon={<RouteIcon sx={{ fontSize: "0.85rem !important", color: "#60a5fa !important" }} />}
            label={selectedTrail.name}
            size="small"
            onClick={() => setTrailFitted(false)}
            sx={{
              bgcolor: "rgba(15,23,42,0.85)",
              color: "white",
              fontSize: "0.7rem",
              backdropFilter: "blur(4px)",
              height: 24,
              cursor: "pointer",
              "& .MuiChip-label": { pr: 1 },
            }}
          />
        </Box>
      )}

      {/* Bottom controls overlay */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 80%, transparent 100%)",
          pt: 6,
          pb: { xs: 3, md: 2.5 },
          px: 2,
        }}
      >
        {/* Offline map download — only useful before setting off */}
        {trackingState === "idle" && (
          <Stack direction="row" justifyContent="center" mb={2}>
            <OfflineMapButton
              mountainLat={mountainLat}
              mountainLng={mountainLng}
              trailPositions={trailPositions}
            />
          </Stack>
        )}

        {/* Stats bar */}
        {trackingState !== "idle" && trackingState !== "selecting" && (
          <Stack direction="row" spacing={1.5} justifyContent="center" mb={2} flexWrap="wrap" useFlexGap>
            <Paper sx={{ px: 2, py: 1, borderRadius: 2.5, bgcolor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", textAlign: "center", minWidth: 72 }}>
              <Typography variant="h6" fontWeight={800} lineHeight={1.1} sx={{ fontVariantNumeric: "tabular-nums", color: "white" }}>
                {formatDuration(elapsed)}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>Time</Typography>
            </Paper>

            <Paper sx={{ px: 2, py: 1, borderRadius: 2.5, bgcolor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", textAlign: "center", minWidth: 72 }}>
              <Typography variant="h6" fontWeight={800} lineHeight={1.1} sx={{ color: "white" }}>
                {formatDistance(distanceMeters)}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>Distance</Typography>
            </Paper>

            {gainMeters !== null && gainMeters > 0 && (
              <Paper sx={{ px: 2, py: 1, borderRadius: 2.5, bgcolor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", textAlign: "center", minWidth: 72 }}>
                <Typography variant="h6" fontWeight={800} lineHeight={1.1} sx={{ color: "white" }}>
                  {Math.round(gainMeters * 3.28084).toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>Gain (ft)</Typography>
              </Paper>
            )}

            {currentPos?.altitude != null && (
              <Paper sx={{ px: 2, py: 1, borderRadius: 2.5, bgcolor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", textAlign: "center", minWidth: 72 }}>
                <Typography variant="h6" fontWeight={800} lineHeight={1.1} sx={{ color: "white" }}>
                  {Math.round(currentPos.altitude * 3.28084).toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>Alt (ft)</Typography>
              </Paper>
            )}

            {currentPos && (
              <Paper sx={{ px: 2, py: 1, borderRadius: 2.5, bgcolor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", textAlign: "center", minWidth: 72 }}>
                <Typography variant="h6" fontWeight={800} lineHeight={1.1} sx={{ color: "white" }}>
                  ±{Math.round(currentPos.accuracy)}m
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>Accuracy</Typography>
              </Paper>
            )}
          </Stack>
        )}

        {/* Control buttons */}
        <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
          {trackingState === "idle" && (
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartHike}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                fontWeight: 700,
                bgcolor: "#15803d",
                "&:hover": { bgcolor: "#166534" },
              }}
            >
              Start Hike
            </Button>
          )}

          {trackingState === "tracking" && (
            <>
              <IconButton
                onClick={handlePause}
                sx={{
                  bgcolor: "rgba(255,255,255,0.9)",
                  width: 52,
                  height: 52,
                  "&:hover": { bgcolor: "white" },
                  boxShadow: 2,
                }}
              >
                <PauseIcon />
              </IconButton>
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleFinish}
                sx={{ borderRadius: 3, px: 3, py: 1.5, fontWeight: 700 }}
              >
                Finish
              </Button>
              <IconButton
                onClick={() => setFollowUser((f) => !f)}
                sx={{
                  bgcolor: followUser ? "#3b82f6" : "rgba(255,255,255,0.9)",
                  color: followUser ? "white" : "text.primary",
                  width: 52,
                  height: 52,
                  boxShadow: 2,
                  "&:hover": { bgcolor: followUser ? "#2563eb" : "white" },
                }}
              >
                {followUser ? <GpsFixedIcon /> : <GpsNotFixedIcon />}
              </IconButton>
            </>
          )}

          {trackingState === "paused" && (
            <>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleResume}
                sx={{ borderRadius: 3, px: 3, py: 1.5, fontWeight: 700, bgcolor: "#15803d", "&:hover": { bgcolor: "#166534" } }}
              >
                Resume
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleFinish}
                sx={{ borderRadius: 3, px: 3, py: 1.5, fontWeight: 700 }}
              >
                Finish
              </Button>
            </>
          )}

          {trackingState === "stopped" && (
            <>
              <Button
                variant="outlined"
                onClick={handleNewTrack}
                sx={{
                  borderRadius: 3,
                  px: 2.5,
                  py: 1.5,
                  fontWeight: 700,
                  bgcolor: "rgba(255,255,255,0.9)",
                  color: "text.primary",
                  borderColor: "rgba(255,255,255,0.6)",
                  "&:hover": { bgcolor: "white" },
                }}
              >
                New
              </Button>

              {savedTrackId ? (
                <Button
                  component={NextLink}
                  href={`/tracks/${savedTrackId}`}
                  variant="outlined"
                  startIcon={<RouteIcon />}
                  sx={{
                    borderRadius: 3,
                    px: 2.5,
                    py: 1.5,
                    fontWeight: 700,
                    bgcolor: "rgba(255,255,255,0.9)",
                    color: "text.primary",
                    borderColor: "rgba(255,255,255,0.6)",
                    "&:hover": { bgcolor: "white" },
                  }}
                >
                  View Hike
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  disabled={track.length < 2}
                  // Signed-out hikers can still take the GPX away with them, so the
                  // recording isn't wasted — it just can't live on their profile.
                  onClick={() => (user ? setSaveOpen(true) : handleExportGPX())}
                  sx={{
                    borderRadius: 3,
                    px: 2.5,
                    py: 1.5,
                    fontWeight: 700,
                    bgcolor: "rgba(255,255,255,0.9)",
                    color: "text.primary",
                    borderColor: "rgba(255,255,255,0.6)",
                    "&:hover": { bgcolor: "white" },
                    "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.4)" },
                  }}
                >
                  {user ? "Save Hike" : "Download GPX"}
                </Button>
              )}

              <Button
                onClick={handleLogSummit}
                variant="contained"
                sx={{
                  borderRadius: 3,
                  px: 2.5,
                  py: 1.5,
                  fontWeight: 700,
                  bgcolor: "#1d4ed8",
                  "&:hover": { bgcolor: "#1e40af" },
                }}
              >
                Log Summit
              </Button>
            </>
          )}
        </Stack>

        {/* Status chips */}
        {trackingState === "tracking" && (
          <Stack direction="row" justifyContent="center" mt={1.5}>
            {currentPos ? (
              <Chip
                icon={<GpsFixedIcon sx={{ fontSize: "0.85rem !important" }} />}
                label={`GPS locked · ±${Math.round(currentPos.accuracy)}m · ${track.length} pts`}
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.85)", fontSize: "0.7rem", height: 22 }}
              />
            ) : (
              <Chip
                icon={<GpsNotFixedIcon sx={{ fontSize: "0.85rem !important" }} />}
                label="Acquiring GPS signal…"
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.7)", fontSize: "0.7rem", height: 22 }}
              />
            )}
          </Stack>
        )}

        {trackingState === "paused" && (
          <Stack direction="row" justifyContent="center" mt={1.5}>
            <Chip
              label="⏸ Paused · GPS off (saving battery)"
              size="small"
              sx={{ bgcolor: "rgba(245,158,11,0.9)", color: "white", fontSize: "0.7rem", fontWeight: 600, height: 22 }}
            />
          </Stack>
        )}

        {trackingState === "stopped" && (
          <Stack direction="row" justifyContent="center" mt={1.5}>
            <Chip
              label={
                savedTrackId
                  ? `Saved · ${formatDuration(elapsed)} · ${formatDistance(distanceMeters)}`
                  : `Hike complete · ${formatDuration(elapsed)} · ${formatDistance(distanceMeters)}`
              }
              size="small"
              icon={savedTrackId ? <CheckIcon sx={{ fontSize: "0.85rem !important", color: "white !important" }} /> : undefined}
              sx={{ bgcolor: "rgba(21,128,61,0.9)", color: "white", fontSize: "0.7rem", fontWeight: 600, height: 22 }}
            />
          </Stack>
        )}
      </Box>
    </Box>
  );
}
