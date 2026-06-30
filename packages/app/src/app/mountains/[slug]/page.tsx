"use client";

import { use, useState } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BookmarkAddIcon from "@mui/icons-material/BookmarkAdd";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import NaturePeopleIcon from "@mui/icons-material/NaturePeople";
import RouteIcon from "@mui/icons-material/Route";
import StarIcon from "@mui/icons-material/Star";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";
import TrailMap from "@/components/mountains/TrailMap";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: "center", borderRadius: 3, flex: 1, minWidth: 120 }}>
      <Box sx={{ color: "primary.main", mb: 0.5 }}>{icon}</Box>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

// ── Log Summit dialog (records completion + public review) ─────────────────────

function LogSummitDialog({
  open,
  onClose,
  mountainId,
  mountainSlug,
  mountainName,
  trails,
  hasExistingReview,
}: {
  open: boolean;
  onClose: () => void;
  mountainId: string;
  mountainSlug: string;
  mountainName: string;
  trails: { id: string; name: string }[];
  hasExistingReview: boolean;
}) {
  const utils = trpc.useUtils();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [trailId, setTrailId] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");

  const reset = () => {
    setDate(today);
    setTrailId("");
    setRating(null);
    setReviewTitle("");
    setReviewBody("");
  };

  const invalidate = () => {
    utils.user.stats.invalidate();
    utils.user.completions.invalidate();
    utils.user.myCompletion.invalidate({ mountainId });
    utils.mountain.getBySlug.invalidate({ slug: mountainSlug });
    utils.mountain.globalStats.invalidate();
    utils.review.list.invalidate({ mountainId });
    utils.review.myReview.invalidate({ mountainId });
    reset();
    onClose();
  };

  const logMutation = trpc.user.logSummit.useMutation();
  const reviewMutation = trpc.review.add.useMutation({ onSuccess: invalidate });
  const logOnlyMutation = trpc.user.logSummit.useMutation({ onSuccess: invalidate });

  const isPending = logMutation.isPending || reviewMutation.isPending || logOnlyMutation.isPending;
  const canSubmit = !!date && (hasExistingReview || (!!rating && reviewBody.trim().length > 0));

  const handleSubmit = () => {
    if (hasExistingReview) {
      logOnlyMutation.mutate({
        mountainId,
        completedAt: new Date(date).toISOString(),
        trailId: trailId || undefined,
        isPrivate: false,
      });
    } else {
      logMutation.mutate(
        {
          mountainId,
          completedAt: new Date(date).toISOString(),
          trailId: trailId || undefined,
          isPrivate: false,
        },
        {
          onSuccess: () => {
            reviewMutation.mutate({
              mountainId,
              rating: rating!,
              title: reviewTitle || undefined,
              body: reviewBody,
              hikedAt: new Date(date).toISOString(),
            });
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Log Summit — {mountainName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
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
                <option value="">Any route</option>
                {trails.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </TextField>
            )}
          </Stack>

          {!hasExistingReview && (
            <>
              <Divider>
                <Typography variant="caption" color="text.secondary">Public Review</Typography>
              </Divider>
              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Your rating *
                </Typography>
                <Rating
                  value={rating}
                  onChange={(_, v) => setRating(v)}
                  size="large"
                  emptyIcon={<StarIcon fontSize="inherit" />}
                />
              </Box>
              <TextField
                label="Title (optional)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your experience"
                fullWidth
              />
              <TextField
                label="Review *"
                multiline
                rows={4}
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                placeholder="How was the trail? Weather? Tips for others?"
                fullWidth
              />
            </>
          )}

          {hasExistingReview && (
            <Typography variant="body2" color="text.secondary">
              You&apos;ve already reviewed this peak. This will log another summit entry.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit || isPending} onClick={handleSubmit}>
          {isPending ? "Saving…" : "Log Summit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Write / Edit Review dialog ─────────────────────────────────────────────────

function ReviewDialog({
  open,
  onClose,
  mountainId,
  mountainSlug,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  mountainId: string;
  mountainSlug: string;
  existing: { id: string; rating: number; title: string | null; body: string; hikedAt: Date | string | null };
}) {
  const utils = trpc.useUtils();
  const [rating, setRating] = useState(existing.rating);
  const [title, setTitle] = useState(existing.title ?? "");
  const [body, setBody] = useState(existing.body);

  const invalidate = () => {
    utils.review.list.invalidate({ mountainId });
    utils.review.myReview.invalidate({ mountainId });
    utils.mountain.getBySlug.invalidate({ slug: mountainSlug });
    onClose();
  };

  const updateMutation = trpc.review.update.useMutation({ onSuccess: invalidate });

  const isPending = updateMutation.isPending;
  const error = updateMutation.error?.message;

  const handleOpen = () => {
    setRating(existing.rating);
    setTitle(existing.title ?? "");
    setBody(existing.body);
  };

  const handleSubmit = () => {
    updateMutation.mutate({ id: existing.id, rating, title: title || null, body });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionProps={{ onEnter: handleOpen }}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle fontWeight={700}>Edit Review</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Overall rating *
            </Typography>
            <Rating
              value={rating}
              onChange={(_, v) => setRating(v ?? 0)}
              size="large"
              emptyIcon={<StarIcon fontSize="inherit" />}
            />
          </Box>
          <TextField
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            fullWidth
          />
          <TextField
            label="Your review *"
            multiline
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What was the trail like? Weather conditions? Tips for others?"
            fullWidth
          />
          {error && (
            <Typography variant="caption" color="error">{error}</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!rating || !body.trim() || isPending}
          onClick={handleSubmit}
        >
          {isPending ? "Saving…" : "Update Review"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Reviews section ────────────────────────────────────────────────────────────

function ReviewsSection({ mountainId, mountainSlug, accessToken }: { mountainId: string; mountainSlug: string; accessToken: string | null }) {
  const utils = trpc.useUtils();
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data: reviews, isLoading } = trpc.review.list.useQuery({ mountainId });
  const { data: myReview } = trpc.review.myReview.useQuery(
    { mountainId },
    { enabled: !!accessToken }
  );

  const deleteMutation = trpc.review.delete.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate({ mountainId });
      utils.review.myReview.invalidate({ mountainId });
      utils.mountain.getBySlug.invalidate({ slug: mountainSlug });
    },
  });

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  return (
    <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Reviews
          </Typography>
          {avgRating !== null && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Rating value={avgRating} precision={0.5} readOnly size="small" />
              <Typography variant="body2" color="text.secondary">
                {avgRating.toFixed(1)} ({reviews!.length})
              </Typography>
            </Stack>
          )}
        </Box>
      </Box>

      {/* My review pinned at top */}
      {myReview && (
        <Box
          sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "primary.50", border: "1px solid", borderColor: "primary.200" }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box>
              <Typography variant="caption" color="primary" fontWeight={700}>
                Your Review
              </Typography>
              <Rating value={myReview.rating} readOnly size="small" sx={{ mt: 0.5 }} />
              {myReview.title && (
                <Typography fontWeight={600} mt={0.5}>{myReview.title}</Typography>
              )}
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {myReview.body}
              </Typography>
              <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
                {fmtDate(myReview.createdAt)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={() => setReviewOpen(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => deleteMutation.mutate({ id: myReview.id })}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Other reviews */}
      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1.5, borderRadius: 2 }} />
        ))
      ) : (
        <Stack divider={<Divider />} spacing={0}>
          {reviews
            ?.filter((r) => r.userId !== myReview?.userId)
            .map((review) => (
              <Box key={review.id} sx={{ py: 2 }}>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: "primary.light" }}>
                    {initials(review.user.name, review.user.email)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="body2" fontWeight={600}>
                        {review.user.name ?? review.user.email.split("@")[0]}
                      </Typography>
                      <Rating value={review.rating} readOnly size="small" />
                      <Typography variant="caption" color="text.disabled">
                        {fmtDate(review.createdAt)}
                      </Typography>
                    </Box>
                    {review.title && (
                      <Typography variant="body2" fontWeight={600} mt={0.5}>{review.title}</Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" mt={0.25}>
                      {review.body}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
        </Stack>
      )}

      {!isLoading && reviews?.length === 0 && !myReview && (
        <Typography color="text.secondary" variant="body2" textAlign="center" py={2}>
          No reviews yet. Log a summit to leave a review.
        </Typography>
      )}

      {myReview && (
        <ReviewDialog
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          mountainId={mountainId}
          mountainSlug={mountainSlug}
          existing={myReview}
        />
      )}
    </Paper>
  );
}

// ── Private note ───────────────────────────────────────────────────────────────

function PrivateNoteSection({
  completionId,
  notes,
  mountainId,
}: {
  completionId: string;
  notes: string | null;
  mountainId: string;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");

  const updateMutation = trpc.user.updateCompletion.useMutation({
    onSuccess: () => {
      utils.user.myCompletion.invalidate({ mountainId });
      utils.user.completions.invalidate();
      setEditing(false);
    },
  });

  return (
    <Paper sx={{ p: 3, borderRadius: 3, mt: 3, borderLeft: 4, borderColor: "primary.main" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <LockIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700} color="primary">
            Private Note
          </Typography>
          <Chip label="Only you" size="small" sx={{ fontSize: 10, height: 18 }} />
        </Stack>
        {!editing && (
          <IconButton
            size="small"
            onClick={() => { setDraft(notes ?? ""); setEditing(true); }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {editing ? (
        <Stack spacing={1.5}>
          <TextField
            multiline
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your private thoughts on this summit…"
            fullWidth
            size="small"
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={() => setEditing(false)}>Cancel</Button>
            <Button
              size="small"
              variant="contained"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: completionId, notes: draft || null })}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </Stack>
        </Stack>
      ) : notes ? (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
          {notes}
        </Typography>
      ) : (
        <Typography
          variant="body2"
          color="text.disabled"
          fontStyle="italic"
          sx={{ cursor: "pointer" }}
          onClick={() => setEditing(true)}
        >
          Add a private note for this summit…
        </Typography>
      )}
    </Paper>
  );
}

// ── Upload Trail dialog (admin only) ───────────────────────────────────────────

const DIFFICULTY_LABELS: Record<string, string> = {
  CLASS_1: "Class 1",
  CLASS_2: "Class 2",
  CLASS_3: "Class 3",
  CLASS_4: "Class 4",
  CLASS_5: "Class 5",
};

function UploadTrailDialog({
  open,
  onClose,
  mountainId,
  mountainSlug,
}: {
  open: boolean;
  onClose: () => void;
  mountainId: string;
  mountainSlug: string;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState("CLASS_2");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const reset = () => {
    setName("");
    setDifficulty("CLASS_2");
    setFile(null);
    setFileError("");
  };

  const uploadMutation = trpc.trail.uploadGpx.useMutation({
    onSuccess: () => {
      utils.mountain.getBySlug.invalidate({ slug: mountainSlug });
      reset();
      onClose();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileError("");
    if (f && !f.name.toLowerCase().endsWith(".gpx")) {
      setFileError("Only .gpx files are supported");
      setFile(null);
    } else {
      setFile(f);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    const gpxContent = await file.text();
    uploadMutation.mutate({ mountainId, name, difficulty: difficulty as never, gpxContent });
  };

  const canSubmit = name.trim().length > 0 && !!file && !fileError && !uploadMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Upload Trail GPX</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Trail name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Northeast Ridge"
            fullWidth
            required
          />
          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={difficulty}
              label="Difficulty"
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {Object.entries(DIFFICULTY_LABELS).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ borderRadius: 2, py: 1.5, borderStyle: "dashed" }}
            >
              {file ? file.name : "Choose .gpx file"}
              <input type="file" accept=".gpx" hidden onChange={handleFileChange} />
            </Button>
            {fileError && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                {fileError}
              </Typography>
            )}
          </Box>
          {uploadMutation.error && (
            <Typography variant="caption" color="error">
              {uploadMutation.error.message}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}>
          {uploadMutation.isPending ? "Uploading…" : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Edit Trail dialog (admin only) ─────────────────────────────────────────────

type TrailForEdit = {
  id: string; name: string;
  difficulty: "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5";
  description: string | null;
  roundTripMiles: number | null;
  elevationGain: number | null;
  estimatedHours: number | null;
  trailheadElevation: number | null;
};

function EditTrailDialog({
  open,
  onClose,
  trail,
  mountainSlug,
}: {
  open: boolean;
  onClose: () => void;
  trail: TrailForEdit;
  mountainSlug: string;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(trail.name);
  const [difficulty, setDifficulty] = useState(trail.difficulty);
  const [description, setDescription] = useState(trail.description ?? "");
  const [miles, setMiles] = useState(trail.roundTripMiles?.toString() ?? "");
  const [gain, setGain] = useState(trail.elevationGain?.toString() ?? "");
  const [hours, setHours] = useState(trail.estimatedHours?.toString() ?? "");
  const [trailheadElev, setTrailheadElev] = useState(trail.trailheadElevation?.toString() ?? "");

  // Sync fields when trail prop changes (opening a different trail)
  const handleEnter = () => {
    setName(trail.name);
    setDifficulty(trail.difficulty);
    setDescription(trail.description ?? "");
    setMiles(trail.roundTripMiles?.toString() ?? "");
    setGain(trail.elevationGain?.toString() ?? "");
    setHours(trail.estimatedHours?.toString() ?? "");
    setTrailheadElev(trail.trailheadElevation?.toString() ?? "");
  };

  const updateMutation = trpc.trail.update.useMutation({
    onSuccess: () => {
      utils.mountain.getBySlug.invalidate({ slug: mountainSlug });
      onClose();
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate({
      id: trail.id,
      name,
      difficulty,
      description: description.trim() || null,
      roundTripMiles: miles ? parseFloat(miles) : null,
      elevationGain: gain ? parseInt(gain, 10) : null,
      estimatedHours: hours ? parseFloat(hours) : null,
      trailheadElevation: trailheadElev ? parseInt(trailheadElev, 10) : null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionProps={{ onEnter: handleEnter }}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle fontWeight={700}>Edit Trail</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Trail name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={difficulty}
              label="Difficulty"
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            >
              {Object.entries(DIFFICULTY_LABELS).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <TextField label="Round trip (mi)" value={miles} onChange={(e) => setMiles(e.target.value)} type="number" fullWidth size="small" />
            <TextField label="Elevation gain (ft)" value={gain} onChange={(e) => setGain(e.target.value)} type="number" fullWidth size="small" />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Est. hours" value={hours} onChange={(e) => setHours(e.target.value)} type="number" fullWidth size="small" />
            <TextField label="Trailhead elev. (ft)" value={trailheadElev} onChange={(e) => setTrailheadElev(e.target.value)} type="number" fullWidth size="small" />
          </Stack>
          {updateMutation.error && (
            <Typography variant="caption" color="error">{updateMutation.error.message}</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || updateMutation.isPending}
          onClick={handleSubmit}
        >
          {updateMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function MountainDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { accessToken, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [logOpen, setLogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingTrail, setEditingTrail] = useState<TrailForEdit | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: mountain, isLoading, isError } = trpc.mountain.getBySlug.useQuery({ slug });

  // Use the db id (from mountain data) for all user-specific queries
  const id = mountain?.id ?? "";

  // Cast trails once here — Prisma's Json field creates a deep recursive type
  // that causes "type instantiation excessively deep" errors in every .map() call.
  type TrailRow = {
    id: string; name: string;
    difficulty: "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5";
    description: string | null;
    roundTripMiles: number | null; elevationGain: number | null; estimatedHours: number | null;
    trailheadElevation: number | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geometry: any;
  };
  const trails: TrailRow[] = (mountain?.trails ?? []) as TrailRow[];

  const { data: favData } = trpc.user.isFavorite.useQuery(
    { mountainId: id },
    { enabled: !!accessToken && !!id }
  );
  const { data: myCompletion } = trpc.user.myCompletion.useQuery(
    { mountainId: id },
    { enabled: !!accessToken && !!id }
  );
  const { data: myReview } = trpc.review.myReview.useQuery(
    { mountainId: id },
    { enabled: !!accessToken && !!id }
  );

  const deleteTrailMutation = trpc.trail.delete.useMutation({
    onSuccess: () => utils.mountain.getBySlug.invalidate({ slug }),
  });

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
                {myCompletion && (
                  <Chip
                    icon={<EmojiEventsIcon />}
                    label="Summited"
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600 }}
                  />
                )}
              </Stack>

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

      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 4 }, mt: -4, zIndex: 2, position: "relative" }}>
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
          {/* Main column */}
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

            {/* Trail Map */}
            {!isLoading && (() => {
              const trailsWithGeo = trails.filter((t) => t.geometry?.coordinates?.length > 1);
              const activeId = selectedTrailId || trailsWithGeo[0]?.id;
              const visibleTrails = trailsWithGeo.filter((t) => t.id === activeId);
              return (
                <Paper sx={{ borderRadius: 3, mt: 3, overflow: "hidden" }}>
                  <Box sx={{ px: 3, pt: 2.5, pb: trailsWithGeo.length > 1 ? 0 : 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6" fontWeight={700}>Trail Map</Typography>
                    {isAdmin && trailsWithGeo.length === 0 && (
                      <Button size="small" variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => setUploadOpen(true)} sx={{ borderRadius: 2 }}>
                        Upload Trail
                      </Button>
                    )}
                  </Box>
                  {trailsWithGeo.length > 1 && (
                    <Tabs
                      value={activeId}
                      onChange={(_, v) => setSelectedTrailId(v)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}
                    >
                      {trailsWithGeo.map((t) => (
                        <Tab key={t.id} label={t.name} value={t.id} />
                      ))}
                    </Tabs>
                  )}
                  <TrailMap
                    latitude={mountain!.latitude}
                    longitude={mountain!.longitude}
                    name={mountain!.name}
                    trails={visibleTrails}
                    height={400}
                  />
                </Paper>
              );
            })()}

            {/* Trails */}
            {!isLoading && trails.length > 0 && (
              <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="h6" fontWeight={700}>
                    Routes ({trails.length})
                  </Typography>
                  {isAdmin && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      onClick={() => setUploadOpen(true)}
                      sx={{ borderRadius: 2 }}
                    >
                      Upload Trail
                    </Button>
                  )}
                </Box>
                <Stack divider={<Divider />} spacing={0}>
                  {trails.map((trail) => (
                    <Box key={trail.id} sx={{ py: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                        <Typography fontWeight={600}>{trail.name}</Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <DifficultyChip difficulty={trail.difficulty} />
                          {isAdmin && (
                            <>
                              <IconButton size="small" onClick={() => setEditingTrail(trail as TrailForEdit)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={deleteTrailMutation.isPending}
                                onClick={() => deleteTrailMutation.mutate({ id: trail.id })}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Stack>
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
            {/* Private note — only when logged in and has a summit */}
            {accessToken && myCompletion && (
              <PrivateNoteSection
                completionId={myCompletion.id}
                notes={myCompletion.notes}
                mountainId={id}
              />
            )}

            {/* Reviews */}
            <ReviewsSection mountainId={id} mountainSlug={slug} accessToken={accessToken} />
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
                    <Chip
                      icon={<StarIcon fontSize="small" />}
                      label={`${mountain!._count.reviews} reviews`}
                      variant="outlined"
                      size="small"
                    />
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
                    href={`/login?redirect=/mountains/${slug}`}
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
          mountainSlug={slug}
          mountainName={mountain.name}
          trails={trails.map((t) => ({ id: t.id, name: t.name }))}
          hasExistingReview={!!myReview}
        />
      )}

      {mountain && isAdmin && (
        <UploadTrailDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          mountainId={id}
          mountainSlug={slug}
        />
      )}

      {editingTrail && (
        <EditTrailDialog
          open={!!editingTrail}
          onClose={() => setEditingTrail(null)}
          trail={editingTrail}
          mountainSlug={slug}
        />
      )}
    </Box>
  );
}
