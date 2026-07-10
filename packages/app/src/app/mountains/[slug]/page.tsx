"use client";

import { use, useEffect, useRef, useState } from "react";
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
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import InputAdornment from "@mui/material/InputAdornment";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SendIcon from "@mui/icons-material/Send";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CancelIcon from "@mui/icons-material/Cancel";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import AirIcon from "@mui/icons-material/Air";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArticleIcon from "@mui/icons-material/Article";
import CloudIcon from "@mui/icons-material/Cloud";
import ThunderstormIcon from "@mui/icons-material/Thunderstorm";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WbCloudyIcon from "@mui/icons-material/WbCloudy";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BookmarkAddIcon from "@mui/icons-material/BookmarkAdd";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import AddIcon from "@mui/icons-material/Add";
import Popover from "@mui/material/Popover";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import Checkbox from "@mui/material/Checkbox";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import NaturePeopleIcon from "@mui/icons-material/NaturePeople";
import RouteIcon from "@mui/icons-material/Route";
import StarIcon from "@mui/icons-material/Star";
import ShareIcon from "@mui/icons-material/Share";
import TerrainIcon from "@mui/icons-material/Terrain";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import RangeLabel from "@/components/mountains/RangeLabel";
import TrailMap from "@/components/mountains/TrailMap";
import ElevationProfile from "@/components/mountains/ElevationProfile";
import GearChecklist from "@/components/mountains/GearChecklist";
import PhotoGallery from "@/components/mountains/PhotoGallery";
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
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, textAlign: "center", borderRadius: 3, flex: 1, minWidth: 110 }}>
      <Box sx={{ color: "primary.main", mb: 0.5, "& svg": { fontSize: { xs: "1.2rem", md: "1.5rem" } } }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: "0.7rem", md: "0.75rem" } }}>{label}</Typography>
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
  onAchievements,
}: {
  open: boolean;
  onClose: () => void;
  mountainId: string;
  mountainSlug: string;
  mountainName: string;
  trails: { id: string; name: string }[];
  hasExistingReview: boolean;
  onAchievements: (types: string[]) => void;
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

  const invalidate = (newAchievements: string[] = []) => {
    utils.user.stats.invalidate();
    utils.user.completions.invalidate();
    utils.user.myCompletion.invalidate({ mountainId });
    utils.mountain.getBySlug.invalidate({ slug: mountainSlug });
    utils.mountain.globalStats.invalidate();
    utils.review.list.invalidate({ mountainId });
    utils.review.myReview.invalidate({ mountainId });
    utils.user.achievements.invalidate();
    utils.recommendation.get.invalidate();
    if (newAchievements.length > 0) onAchievements(newAchievements);
    reset();
    onClose();
  };

  const logMutation = trpc.user.logSummit.useMutation();
  const reviewMutation = trpc.review.add.useMutation({ onSuccess: () => invalidate() });
  const logOnlyMutation = trpc.user.logSummit.useMutation({
    onSuccess: (data) => invalidate(data.newAchievements),
  });

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
          onSuccess: (data) => {
            reviewMutation.mutate(
              {
                mountainId,
                rating: rating!,
                title: reviewTitle || undefined,
                body: reviewBody,
                hikedAt: new Date(date).toISOString(),
              },
              { onSuccess: () => invalidate(data.newAchievements) }
            );
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
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mt: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>
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
              <Typography variant="body2" color="text.secondary" mt={0.5} sx={{ fontSize: { xs: "0.8125rem", md: "0.875rem" }, lineHeight: 1.6 }}>
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
                  <Avatar src={review.user.avatar ?? undefined} sx={{ width: 32, height: 32, fontSize: 12, bgcolor: "primary.light" }}>
                    {!review.user.avatar && initials(review.user.name, review.user.email)}
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
                    <Typography variant="body2" color="text.secondary" mt={0.25} sx={{ fontSize: { xs: "0.8125rem", md: "0.875rem" }, lineHeight: 1.6 }}>
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

// ── Mountain Photo Manager (admin only) ────────────────────────────────────────

function resizeMountainPhoto(file: File, size = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(size / img.width, size / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function MountainPhotoManager({ mountainId, mountainSlug }: { mountainId: string; mountainSlug: string }) {
  const utils = trpc.useUtils();
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: photos, isLoading } = trpc.mountain.photos.useQuery({ mountainId }, { enabled: !!mountainId });

  const invalidate = () => {
    utils.mountain.photos.invalidate({ mountainId });
    utils.mountain.getBySlug.invalidate({ slug: mountainSlug });
  };

  const addMutation = trpc.mountain.addPhoto.useMutation({ onSuccess: invalidate, onError: (e) => setError(e.message) });
  const deleteMutation = trpc.mountain.deletePhoto.useMutation({ onSuccess: invalidate });
  const setMainMutation = trpc.mountain.setMainPhoto.useMutation({ onSuccess: invalidate });

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) { setError(`${file.name} exceeds 10 MB limit`); continue; }
      try {
        const url = await resizeMountainPhoto(file);
        await addMutation.mutateAsync({ mountainId, url });
      } catch {
        setError(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    if (fileInput) fileInput.value = "";
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <CameraAltIcon color="primary" />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" }, flex: 1 }}>
          Manage Photos
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={uploading ? <CircularProgress size={14} /> : <AddPhotoAlternateIcon />}
          disabled={uploading}
          onClick={() => fileInput?.click()}
          sx={{ borderRadius: 2 }}
        >
          Upload
        </Button>
        <input
          ref={setFileInput}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}

      {isLoading ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" width={120} height={90} sx={{ borderRadius: 2 }} />)}
        </Stack>
      ) : !photos || photos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No photos uploaded yet. Click Upload to add the first one.</Typography>
      ) : (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {photos.map((photo) => (
            <Box key={photo.id} sx={{ position: "relative", width: 140, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? "Mountain photo"}
                style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8, display: "block", border: photo.isMain ? "2.5px solid" : "2px solid transparent" }}
              />
              {photo.isMain && (
                <Chip label="Main" size="small" color="primary" sx={{ position: "absolute", top: 4, left: 4, height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
              )}
              <Stack direction="row" spacing={0} justifyContent="center" mt={0.5}>
                {!photo.isMain && (
                  <Tooltip title="Set as main photo">
                    <IconButton size="small" onClick={() => setMainMutation.mutate({ id: photo.id })} disabled={setMainMutation.isPending}>
                      <StarIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Delete photo">
                  <IconButton size="small" color="error" onClick={() => deleteMutation.mutate({ id: photo.id })} disabled={deleteMutation.isPending}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ── Trip Reports section ────────────────────────────────────────────────────────

const CONDITIONS_LABELS: Record<string, { label: string; color: string }> = {
  EXCELLENT: { label: "Excellent", color: "success" },
  GOOD:      { label: "Good",      color: "info" },
  FAIR:      { label: "Fair",      color: "warning" },
  POOR:      { label: "Poor",      color: "error" },
};

// ── Comment thread ─────────────────────────────────────────────────────────────

function CommentThread({ tripReportId, accessToken, userId, initialCount }: { tripReportId: string; accessToken: string | null; userId: string | null; initialCount: number }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const { data: comments, isLoading } = trpc.comment.list.useQuery(
    { tripReportId },
    { enabled: open }
  );

  const addMutation = trpc.comment.add.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ tripReportId });
      setDraft("");
    },
  });
  const deleteMutation = trpc.comment.delete.useMutation({
    onSuccess: () => utils.comment.list.invalidate({ tripReportId }),
  });

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box
        component="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "inline-flex", alignItems: "center", gap: 0.5,
          background: "none", border: "none", cursor: "pointer", p: 0,
          color: "text.secondary", fontSize: "0.8rem",
          "&:hover": { color: "primary.main" },
        }}
      >
        <ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />
        {open
          ? `Hide comments`
          : `Comments${(comments?.length ?? initialCount) > 0 ? ` (${comments?.length ?? initialCount})` : ""}`}
      </Box>

      <Collapse in={open}>
        <Box sx={{ mt: 1.5, pl: 0 }}>
          {isLoading ? (
            <CircularProgress size={16} />
          ) : comments?.length === 0 ? (
            <Typography variant="caption" color="text.disabled">No comments yet.</Typography>
          ) : (
            <Stack spacing={1} mb={1.5}>
              {comments?.map((c) => (
                <Box key={c.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <Avatar
                    component={NextLink}
                    href={`/users/${c.user.id}`}
                    src={c.user.avatar ?? undefined}
                    sx={{ width: 24, height: 24, fontSize: 10, flexShrink: 0, textDecoration: "none" }}
                  >
                    {!c.user.avatar && (c.user.name ?? c.user.email).slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, bgcolor: "action.hover", borderRadius: 2, px: 1.5, py: 0.75 }}>
                    <Typography
                      component={NextLink}
                      href={`/users/${c.user.id}`}
                      variant="caption"
                      fontWeight={700}
                      sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                    >
                      {c.user.name ?? c.user.email.split("@")[0]}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>{c.body}</Typography>
                  </Box>
                  {userId === c.user.id && (
                    <IconButton size="small" sx={{ flexShrink: 0, mt: 0.25 }} onClick={() => deleteMutation.mutate({ id: c.id })}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>
          )}

          {accessToken && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Add a comment…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && draft.trim()) {
                    e.preventDefault();
                    addMutation.mutate({ tripReportId, body: draft.trim() });
                  }
                }}
                fullWidth
                inputProps={{ maxLength: 1000 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        disabled={!draft.trim() || addMutation.isPending}
                        onClick={() => addMutation.mutate({ tripReportId, body: draft.trim() })}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Trip Report Dialog ──────────────────────────────────────────────────────────

function TripReportDialog({
  open,
  onClose,
  mountainId,
  mountainSlug,
  trails,
}: {
  open: boolean;
  onClose: () => void;
  mountainId: string;
  mountainSlug: string;
  trails: { id: string; name: string }[];
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [conditions, setConditions] = useState<"EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "">("");
  const [trailId, setTrailId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    setUploadError(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  }

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setUploadError(null);
  }

  function handleClose() {
    clearPhoto();
    setTitle(""); setBody(""); setConditions(""); setTrailId(""); setIsPublic(true);
    onClose();
  }

  const createMutation = trpc.tripReport.create.useMutation({
    onSuccess: () => {
      utils.tripReport.list.invalidate({ mountainId });
      handleClose();
    },
  });

  async function handlePublish() {
    let photoUrl: string | undefined;

    if (photoFile) {
      setUploading(true);
      setUploadError(null);
      try {
        const form = new FormData();
        form.append("photo", photoFile);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/photo`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        photoUrl = data.url;
      } catch {
        setUploadError("Photo upload failed. Try again or submit without a photo.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    createMutation.mutate({
      mountainId,
      trailId: trailId || undefined,
      title: title.trim(),
      body: body.trim(),
      conditions: conditions || undefined,
      photoUrl,
      isPublic,
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>Write a Trip Report</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Perfect bluebird day on the East Ridge"
            fullWidth
            inputProps={{ maxLength: 120 }}
          />
          <TextField
            label="Report"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the conditions, route, gear, highlights…"
            multiline
            rows={6}
            fullWidth
            inputProps={{ maxLength: 5000 }}
          />
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Conditions</InputLabel>
              <Select
                value={conditions}
                label="Conditions"
                onChange={(e) => setConditions(e.target.value as typeof conditions)}
              >
                <MenuItem value=""><em>Not specified</em></MenuItem>
                <MenuItem value="EXCELLENT">Excellent</MenuItem>
                <MenuItem value="GOOD">Good</MenuItem>
                <MenuItem value="FAIR">Fair</MenuItem>
                <MenuItem value="POOR">Poor</MenuItem>
              </Select>
            </FormControl>
            {trails.length > 0 && (
              <FormControl fullWidth size="small">
                <InputLabel>Trail</InputLabel>
                <Select value={trailId} label="Trail" onChange={(e) => setTrailId(e.target.value)}>
                  <MenuItem value=""><em>Not specified</em></MenuItem>
                  {trails.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>

          {/* Photo upload */}
          {photoPreview ? (
            <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden", lineHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Preview" style={{ width: "100%", maxHeight: 240, objectFit: "cover" }} />
              <IconButton
                size="small"
                onClick={clearPhoto}
                sx={{ position: "absolute", top: 6, right: 6, bgcolor: "rgba(0,0,0,0.55)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.75)" } }}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Button
              component="label"
              variant="outlined"
              startIcon={<AddPhotoAlternateIcon />}
              sx={{ borderStyle: "dashed", borderRadius: 2, py: 1.5 }}
            >
              Add a photo (optional)
              <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            </Button>
          )}

          {uploadError && <Alert severity="error" sx={{ borderRadius: 2 }}>{uploadError}</Alert>}

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={isPublic ? "Public" : "Private"}
              size="small"
              color={isPublic ? "primary" : "default"}
              onClick={() => setIsPublic((v) => !v)}
              sx={{ cursor: "pointer" }}
            />
            <Typography variant="caption" color="text.secondary">
              {isPublic ? "Visible to the community" : "Only visible to you"}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={title.trim().length < 3 || body.trim().length < 10 || uploading || createMutation.isPending}
          onClick={handlePublish}
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {uploading ? "Uploading…" : "Publish"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type ReportForEdit = {
  id: string;
  title: string;
  body: string;
  conditions: string | null;
  photoUrl: string | null;
  isPublic: boolean;
};

function EditTripReportDialog({
  open,
  onClose,
  report,
  mountainId,
}: {
  open: boolean;
  onClose: () => void;
  report: ReportForEdit | null;
  mountainId: string;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [conditions, setConditions] = useState<"EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "">("");
  const [isPublic, setIsPublic] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (report) {
      setTitle(report.title);
      setBody(report.body);
      setConditions((report.conditions as "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "") ?? "");
      setIsPublic(report.isPublic);
      setExistingPhotoUrl(report.photoUrl);
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }, [report]);

  const updateMutation = trpc.tripReport.update.useMutation({
    onSuccess: () => {
      utils.tripReport.list.invalidate({ mountainId });
      onClose();
    },
  });

  async function handleSave() {
    if (!report) return;
    let photoUrl: string | null | undefined = undefined;
    if (photoFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("photo", photoFile);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/photo`, { method: "POST", body: fd });
        const json = await res.json() as { url: string };
        photoUrl = json.url;
      } finally {
        setUploading(false);
      }
    } else if (existingPhotoUrl === null) {
      photoUrl = "";
    }
    updateMutation.mutate({
      id: report.id,
      title,
      body,
      conditions: conditions || null,
      isPublic,
      ...(photoUrl !== undefined && { photoUrl }),
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Edit Trip Report</DialogTitle>
      <DialogContent>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          label="Report"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          multiline
          rows={5}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          select
          label="Conditions"
          value={conditions}
          onChange={(e) => setConditions(e.target.value as "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "")}
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="">No rating</MenuItem>
          {(["EXCELLENT", "GOOD", "FAIR", "POOR"] as const).map((c) => (
            <MenuItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</MenuItem>
          ))}
        </TextField>
        {/* Photo */}
        {(existingPhotoUrl || photoPreview) && (
          <Box sx={{ position: "relative", mb: 1.5, lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview ?? existingPhotoUrl ?? ""}
              alt="Trip photo"
              style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8 }}
            />
            <IconButton
              size="small"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); setExistingPhotoUrl(null); }}
              sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(0,0,0,0.6)", color: "white", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        <Button
          component="label"
          startIcon={<AddPhotoAlternateIcon />}
          size="small"
          sx={{ mb: 2 }}
        >
          {existingPhotoUrl || photoPreview ? "Replace photo" : "Add photo"}
          <input type="file" hidden accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setPhotoFile(f);
            if (f) setPhotoPreview(URL.createObjectURL(f));
          }} />
        </Button>
        <Box>
          <Button
            size="small"
            variant={isPublic ? "contained" : "outlined"}
            onClick={() => setIsPublic(true)}
            sx={{ mr: 1 }}
          >
            Public
          </Button>
          <Button
            size="small"
            variant={!isPublic ? "contained" : "outlined"}
            onClick={() => setIsPublic(false)}
          >
            Private
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!title.trim() || !body.trim() || uploading || updateMutation.isPending}
        >
          {uploading ? "Uploading…" : updateMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TripReportsSection({
  mountainId,
  mountainSlug,
  accessToken,
  trails,
}: {
  mountainId: string;
  mountainSlug: string;
  accessToken: string | null;
  trails: { id: string; name: string }[];
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReportForEdit | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const { data: reports, isLoading } = trpc.tripReport.list.useQuery({ mountainId });

  const deleteMutation = trpc.tripReport.delete.useMutation({
    onSuccess: () => utils.tripReport.list.invalidate({ mountainId }),
  });

  const galleryPhotos = (reports ?? [])
    .filter((r) => !!r.photoUrl)
    .map((r) => ({
      url: r.photoUrl!,
      caption: r.title,
      author: r.user.name ?? r.user.email.split("@")[0],
    }));

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mt: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>
          Trip Reports
          {reports && reports.length > 0 && (
            <Typography component="span" variant="body2" color="text.secondary" ml={1}>
              ({reports.length})
            </Typography>
          )}
        </Typography>
        {accessToken && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArticleIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Write Report
          </Button>
        )}
      </Box>

      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 1.5, borderRadius: 2 }} />
        ))
      ) : reports?.length === 0 ? (
        <Typography color="text.secondary" variant="body2" textAlign="center" py={2}>
          No trip reports yet. Be the first to write one!
        </Typography>
      ) : (
        <Stack divider={<Divider />} spacing={0}>
          {reports?.map((report) => {
            const cond = report.conditions ? CONDITIONS_LABELS[report.conditions] : null;
            return (
              <Box key={report.id} sx={{ py: 2.5 }}>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Avatar
                    component={NextLink}
                    href={`/users/${report.user.id}`}
                    src={report.user.avatar ?? undefined}
                    sx={{ width: 32, height: 32, fontSize: 12, bgcolor: "secondary.main", textDecoration: "none", flexShrink: 0 }}
                  >
                    {!report.user.avatar && initials(report.user.name, report.user.email)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                      <Typography
                        component={NextLink}
                        href={`/users/${report.user.id}`}
                        variant="body2"
                        fontWeight={700}
                        sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                      >
                        {report.user.name ?? report.user.email.split("@")[0]}
                      </Typography>
                      {cond && (
                        <Chip
                          label={cond.label}
                          size="small"
                          color={cond.color as "success" | "info" | "warning" | "error"}
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.7rem" }}
                        />
                      )}
                      {report.trail && (
                        <Typography variant="caption" color="text.secondary">via {report.trail.name}</Typography>
                      )}
                      <Typography variant="caption" color="text.disabled">{fmtDate(report.createdAt)}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600} mb={0.5}>{report.title}</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.65, fontSize: { xs: "0.8125rem", md: "0.875rem" }, whiteSpace: "pre-wrap" }}
                    >
                      {report.body}
                    </Typography>
                    {report.photoUrl && (
                      <Box
                        onClick={() => {
                          const idx = galleryPhotos.findIndex((p) => p.url === report.photoUrl);
                          setGalleryIndex(idx >= 0 ? idx : 0);
                        }}
                        sx={{ display: "block", mt: 1.5, borderRadius: 2, overflow: "hidden", lineHeight: 0, cursor: "zoom-in", "&:hover img": { filter: "brightness(0.9)" } }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={report.photoUrl}
                          alt="Trip photo"
                          style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block", transition: "filter 0.2s" }}
                        />
                      </Box>
                    )}
                    <CommentThread tripReportId={report.id} accessToken={accessToken} userId={user?.id ?? null} initialCount={report._count.comments} />
                  </Box>
                  {/* Edit/Delete own report */}
                  {user?.id === report.user.id && (
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                      <Tooltip title="Edit report">
                        <IconButton
                          size="small"
                          onClick={() => setEditTarget({
                            id: report.id,
                            title: report.title,
                            body: report.body,
                            conditions: report.conditions ?? null,
                            photoUrl: report.photoUrl ?? null,
                            isPublic: report.isPublic,
                          })}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete report">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteMutation.mutate({ id: report.id })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      <TripReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mountainId={mountainId}
        mountainSlug={mountainSlug}
        trails={trails}
      />
      <EditTripReportDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        report={editTarget}
        mountainId={mountainId}
      />
      <PhotoGallery
        photos={galleryPhotos}
        open={galleryIndex !== null}
        index={galleryIndex ?? 0}
        onClose={() => setGalleryIndex(null)}
        onIndexChange={setGalleryIndex}
      />
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

// ── Weather forecast ───────────────────────────────────────────────────────────

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  "clear": <WbSunnyIcon sx={{ color: "#f59e0b" }} />,
  "partly-cloudy": <WbCloudyIcon sx={{ color: "#94a3b8" }} />,
  "cloudy": <CloudIcon sx={{ color: "#64748b" }} />,
  "rain": <WaterDropIcon sx={{ color: "#3b82f6" }} />,
  "snow": <AcUnitIcon sx={{ color: "#7dd3fc" }} />,
  "thunderstorm": <ThunderstormIcon sx={{ color: "#8b5cf6" }} />,
};

function WeatherSection({ latitude, longitude }: { latitude: number; longitude: number }) {
  const { data: forecast, isLoading } = trpc.weather.getForecast.useQuery({ latitude, longitude });
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeCardIdx, setActiveCardIdx] = useState(0);

  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md")); // ≥900px → 3 visible
  const isSm = useMediaQuery(theme.breakpoints.up("sm")); // ≥600px → 2 visible
  const visibleItems = isMd ? 3 : isSm ? 2 : 1;

  const hasMonsoonRisk = forecast?.some((d) => d.precipChance > 60) ?? false;
  const total = forecast?.length ?? 0;
  const pageCount = Math.ceil(total / visibleItems);
  // active dot = which "page" the leading visible card belongs to
  const activeDot = Math.floor(activeCardIdx / visibleItems);

  function scrollTo(cardIdx: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[cardIdx] as HTMLElement | undefined;
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setActiveCardIdx(cardIdx);
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = (track.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
    setActiveCardIdx(Math.round(track.scrollLeft / cardWidth));
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <WbSunnyIcon sx={{ color: "warning.main", fontSize: "1.2rem" }} />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" }, flex: 1 }}>
          Summit Forecast
        </Typography>
        <Typography variant="caption" color="text.secondary">7-day · Denver time</Typography>
        {/* Prev / Next arrows */}
        {!isLoading && total > 0 && (
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" disabled={activeDot === 0} onClick={() => scrollTo(Math.max(0, activeDot - 1) * visibleItems)}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" disabled={activeDot >= pageCount - 1} onClick={() => scrollTo(Math.min(pageCount - 1, activeDot + 1) * visibleItems)}>
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
      </Stack>

      {hasMonsoonRisk && (
        <Stack direction="row" spacing={1} alignItems="center" mb={2} sx={{ p: 1.5, bgcolor: "warning.50", borderRadius: 2, border: "1px solid", borderColor: "warning.200" }}>
          <WarningAmberIcon sx={{ color: "warning.main", fontSize: "1rem" }} />
          <Typography variant="caption" color="warning.dark" fontWeight={600}>
            Afternoon thunderstorms likely — plan to summit before noon
          </Typography>
        </Stack>
      )}

      {isLoading ? (
        <Stack direction="row" spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={148} sx={{ flex: { xs: "0 0 100%", sm: "0 0 calc(50% - 6px)", md: "0 0 calc(33.33% - 8px)" }, borderRadius: 2 }} />
          ))}
        </Stack>
      ) : forecast && forecast.length > 0 ? (
        <>
          {/* Scroll track */}
          <Box
            ref={trackRef}
            onScroll={handleScroll}
            sx={{
              display: "flex",
              gap: 1.5,
              overflowX: "auto",
              overflowY: "visible",
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              pt: 1.5,
              pb: 0.5,
            }}
          >
            {forecast.map((day) => (
              <Paper
                key={day.date}
                variant="outlined"
                sx={{
                  // 1 on phone, 2 on tablet, 3 on desktop
                  flex: { xs: "0 0 100%", sm: "0 0 calc(50% - 6px)", md: "0 0 calc(33.33% - 8px)" },
                  scrollSnapAlign: "start",
                  p: { xs: 1.5, md: 2 },
                  borderRadius: 2,
                  textAlign: "center",
                  position: "relative",
                  flexShrink: 0,
                  overflow: "visible",
                  ...(day.isBestDay && {
                    borderColor: "success.main",
                    bgcolor: "success.50",
                  }),
                }}
              >
                {day.isBestDay && (
                  <Chip
                    label="Best day"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      bgcolor: "success.main",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      height: 20,
                    }}
                  />
                )}
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Typography>
                <Box sx={{ fontSize: "1.75rem", lineHeight: 1, mb: 0.5 }}>
                  {WEATHER_ICONS[day.icon] ?? <CloudIcon />}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1} sx={{ fontSize: "0.7rem" }}>
                  {day.condition}
                </Typography>
                <Stack direction="row" justifyContent="center" spacing={0.5} mb={0.75}>
                  <Typography variant="body2" fontWeight={700}>{day.tempMax}°</Typography>
                  <Typography variant="body2" color="text.secondary">/ {day.tempMin}°F</Typography>
                </Stack>
                <Stack direction="row" justifyContent="center" spacing={1.5}>
                  <Stack direction="row" spacing={0.25} alignItems="center">
                    <WaterDropIcon sx={{ fontSize: "0.75rem", color: "info.main" }} />
                    <Typography variant="caption" color="text.secondary">{day.precipChance}%</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.25} alignItems="center">
                    <AirIcon sx={{ fontSize: "0.75rem", color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">{day.windMax} mph</Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Box>
          {/* Dot indicators — one per page */}
          <Stack direction="row" justifyContent="center" spacing={0.75} mt={1.5}>
            {Array.from({ length: pageCount }).map((_, i) => (
              <Box
                key={i}
                onClick={() => scrollTo(i * visibleItems)}
                sx={{
                  width: i === activeDot ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: i === activeDot ? "primary.main" : "action.disabled",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </Stack>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">Forecast unavailable.</Typography>
      )}
    </Paper>
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
  const [photoManagerOpen, setPhotoManagerOpen] = useState(false);
  const [listAnchor, setListAnchor] = useState<null | HTMLElement>(null);
  const [newListName, setNewListName] = useState("");
  const [editingTrail, setEditingTrail] = useState<TrailForEdit | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string>("");
  const [achievementToast, setAchievementToast] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

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

  const { data: nearbyPeaks } = trpc.mountain.nearby.useQuery(
    { mountainId: id },
    { enabled: !!id }
  );
  const { data: conditions } = trpc.mountain.recentConditions.useQuery(
    { mountainId: id },
    { enabled: !!id }
  );
  const { data: conditionsSummary } = trpc.mountain.conditionsSummary.useQuery(
    { mountainId: id },
    { enabled: !!id }
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

  const { data: myLists } = trpc.list.myLists.useQuery(undefined, { enabled: !!accessToken });
  const { data: listsForMountain } = trpc.list.listsForMountain.useQuery(
    { mountainId: id },
    { enabled: !!accessToken && !!id && !!listAnchor }
  );
  const addToListMutation = trpc.list.addMountain.useMutation({
    onSuccess: () => utils.list.listsForMountain.invalidate({ mountainId: id }),
  });
  const removeFromListMutation = trpc.list.removeMountain.useMutation({
    onSuccess: () => utils.list.listsForMountain.invalidate({ mountainId: id }),
  });
  const createListMutation = trpc.list.create.useMutation({
    onSuccess: (newList) => {
      utils.list.myLists.invalidate();
      addToListMutation.mutate({ listId: newList.id, mountainId: id });
      setNewListName("");
    },
  });
  const inAnyList = (listsForMountain?.length ?? 0) > 0;

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
          background: mountain?.imageUrl
            ? `linear-gradient(rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.6) 100%), url(${mountain.imageUrl}) center/cover no-repeat`
            : "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #15803d 100%)",
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
              <Typography variant="h2" fontWeight={700} gutterBottom sx={{ fontSize: { xs: "1.9rem", md: "3.75rem" }, lineHeight: { xs: 1.15, md: 1.2 } }}>
                {mountain!.name}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h4" fontWeight={800} sx={{ opacity: 0.95, fontSize: { xs: "1.35rem", md: "2.125rem" } }}>
                  {mountain!.altitude.toLocaleString()} ft
                </Typography>
                {myCompletion && (
                  <Chip
                    icon={<EmojiEventsIcon />}
                    label="Summited"
                    sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600 }}
                  />
                )}
                {conditionsSummary && (
                  <Chip
                    label={`Conditions: ${conditionsSummary.label} · ${conditionsSummary.count} report${conditionsSummary.count !== 1 ? "s" : ""}`}
                    size="small"
                    sx={{
                      bgcolor: conditionsSummary.label === "Excellent" ? "rgba(34,197,94,0.25)"
                        : conditionsSummary.label === "Good" ? "rgba(59,130,246,0.25)"
                        : conditionsSummary.label === "Fair" ? "rgba(245,158,11,0.25)"
                        : "rgba(239,68,68,0.25)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.72rem",
                    }}
                  />
                )}
              </Stack>

              {accessToken && (
                <Stack direction="row" spacing={1.5} mt={3} flexWrap="wrap" useFlexGap>
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
                  {accessToken && (
                    <Tooltip title={inAnyList ? "In your lists" : "Add to list"}>
                      <IconButton
                        onClick={(e) => setListAnchor(e.currentTarget)}
                        sx={{
                          color: "white",
                          bgcolor: inAnyList ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.2)",
                          backdropFilter: "blur(4px)",
                          "&:hover": { bgcolor: inAnyList ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.3)" },
                        }}
                      >
                        {inAnyList ? <PlaylistAddCheckIcon /> : <PlaylistAddIcon />}
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Share">
                    <IconButton
                      onClick={() => {
                        const url = window.location.href;
                        const shareData = {
                          title: mountain!.name,
                          text: `${mountain!.name} — ${mountain!.altitude.toLocaleString()} ft | co14ners`,
                          url,
                        };
                        if (navigator.share && navigator.canShare(shareData)) {
                          navigator.share(shareData);
                        } else {
                          navigator.clipboard.writeText(url);
                          setToast("Link copied to clipboard!");
                        }
                      }}
                      sx={{
                        color: "white",
                        bgcolor: "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(4px)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                      }}
                    >
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                  {isAdmin && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CameraAltIcon />}
                      onClick={() => setPhotoManagerOpen((v) => !v)}
                      sx={{ color: "white", borderColor: "rgba(255,255,255,0.5)", backdropFilter: "blur(4px)", "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } }}
                    >
                      {photoManagerOpen ? "Hide Photos" : "Manage Photos"}
                    </Button>
                  )}
                </Stack>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Admin photo manager dialog */}
      {isAdmin && mountain && (
        <Dialog open={photoManagerOpen} onClose={() => setPhotoManagerOpen(false)} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
            <CameraAltIcon color="primary" />
            <Typography variant="h6" fontWeight={600} component="span" sx={{ flex: 1 }}>
              Manage Photos — {mountain.name}
            </Typography>
            <IconButton onClick={() => setPhotoManagerOpen(false)} size="small"><CancelIcon sx={{ fontSize: 18 }} /></IconButton>
          </DialogTitle>
          <DialogContent>
            <MountainPhotoManager mountainId={id} mountainSlug={slug} />
          </DialogContent>
        </Dialog>
      )}

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

        {/* Weather Forecast */}
        {!isLoading && mountain && (
          <WeatherSection latitude={mountain.latitude} longitude={mountain.longitude} />
        )}

        <Grid container spacing={3}>
          {/* Main column */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>About</Typography>
              {isLoading ? (
                <>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="70%" />
                </>
              ) : (
                <Typography color="text.secondary" sx={{ lineHeight: 1.8, fontSize: { xs: "0.875rem", md: "1rem" } }}>
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
                    <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Trail Map</Typography>
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
                  {visibleTrails[0] && (
                    <ElevationProfile
                      key={visibleTrails[0].id}
                      trailId={visibleTrails[0].id}
                      trailheadElevation={visibleTrails[0].trailheadElevation}
                    />
                  )}
                </Paper>
              );
            })()}

            {/* Trails */}
            {!isLoading && trails.length > 0 && (
              <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mt: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>
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
                        <Typography fontWeight={600} sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}>{trail.name}</Typography>
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

            {/* Trip Reports */}
            <TripReportsSection
              mountainId={id}
              mountainSlug={slug}
              accessToken={accessToken}
              trails={trails.map((t) => ({ id: t.id, name: t.name }))}
            />
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Details</Typography>
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

            {/* Recent Conditions */}
            {conditions && conditions.length > 0 && (
              <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, mt: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                  <ArticleIcon sx={{ fontSize: "1.1rem", color: "info.main" }} />
                  <Typography variant="subtitle2" fontWeight={700}>Recent Conditions</Typography>
                </Stack>
                <Stack divider={<Divider />} spacing={0}>
                  {conditions.map((c) => (
                    <Box key={c.id} sx={{ py: 1.25 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
                        <Avatar src={c.user.avatar ?? undefined} sx={{ width: 22, height: 22, fontSize: 10, bgcolor: "primary.light" }}>
                          {!c.user.avatar && (c.user.name ?? c.user.email).slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Typography
                          component={NextLink}
                          href={`/users/${c.user.id}`}
                          variant="caption"
                          fontWeight={600}
                          sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                        >
                          {c.user.name ?? c.user.email.split("@")[0]}
                        </Typography>
                        {c.rating !== null && (
                          <Rating value={c.rating} readOnly size="small" sx={{ "& svg": { fontSize: "0.75rem" } }} />
                        )}
                        <Typography variant="caption" color="text.disabled" ml="auto !important">
                          {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {c.text}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* Gear Checklist */}
            {mountain && (
              <Box mt={2}>
                <GearChecklist mountainId={id} difficulty={mountain.difficulty} />
              </Box>
            )}

            {/* Nearby Peaks */}
            {nearbyPeaks && nearbyPeaks.length > 0 && (
              <Paper sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Nearby Peaks</Typography>
                <Stack spacing={0} divider={<Divider />}>
                  {nearbyPeaks.map((p) => (
                    <Box
                      key={p.id}
                      component={NextLink}
                      href={`/mountains/${p.slug}`}
                      sx={{
                        py: 1.25,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        textDecoration: "none",
                        color: "inherit",
                        "&:hover .nearby-name": { color: "primary.main" },
                      }}
                    >
                      <TerrainIcon sx={{ fontSize: "1rem", color: "text.disabled", flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography className="nearby-name" variant="body2" fontWeight={600} noWrap sx={{ transition: "color 0.15s" }}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.altitude.toLocaleString()} ft · {p.distanceMiles.toFixed(1)} mi away
                        </Typography>
                      </Box>
                      <ArrowForwardIcon sx={{ fontSize: "0.9rem", color: "text.disabled", flexShrink: 0 }} />
                    </Box>
                  ))}
                </Stack>
              </Paper>
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
          onAchievements={setAchievementToast}
        />
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <Snackbar
        open={achievementToast.length > 0}
        autoHideDuration={5000}
        onClose={() => setAchievementToast([])}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAchievementToast([])}
          severity="success"
          variant="filled"
          icon={<EmojiEventsIcon />}
          sx={{ minWidth: 280, borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={700}>Achievement Unlocked!</Typography>
          {achievementToast.map((t) => (
            <Typography key={t} variant="caption" display="block">
              🏔️ {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Typography>
          ))}
        </Alert>
      </Snackbar>

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

      {/* Add-to-list popover */}
      <Popover
        open={!!listAnchor}
        anchorEl={listAnchor}
        onClose={() => { setListAnchor(null); setNewListName(""); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, width: 280, borderRadius: 2 } } }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography fontWeight={700} variant="body2" mb={1}>Add to list</Typography>
          {(!myLists || myLists.length === 0) ? (
            <Typography variant="caption" color="text.secondary">No lists yet — create one below.</Typography>
          ) : (
            <List disablePadding dense>
              {myLists.map((lst) => {
                const checked = listsForMountain?.includes(lst.id) ?? false;
                return (
                  <ListItem key={lst.id} disablePadding sx={{ borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}>
                    <ListItemText
                      primary={lst.name}
                      secondary={`${lst._count.items} peak${lst._count.items !== 1 ? "s" : ""}`}
                      primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: "caption" }}
                      sx={{ px: 1, py: 0.5, cursor: "pointer" }}
                      onClick={() => checked
                        ? removeFromListMutation.mutate({ listId: lst.id, mountainId: id })
                        : addToListMutation.mutate({ listId: lst.id, mountainId: id })
                      }
                    />
                    <ListItemSecondaryAction>
                      <Checkbox
                        size="small"
                        checked={checked}
                        onChange={() => checked
                          ? removeFromListMutation.mutate({ listId: lst.id, mountainId: id })
                          : addToListMutation.mutate({ listId: lst.id, mountainId: id })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1.5, display: "flex", gap: 1 }}>
          <TextField
            size="small"
            placeholder="New list name…"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newListName.trim()) {
                createListMutation.mutate({ name: newListName.trim() });
              }
            }}
            sx={{ flex: 1 }}
            inputProps={{ maxLength: 80 }}
          />
          <IconButton
            size="small"
            color="primary"
            disabled={!newListName.trim() || createListMutation.isPending}
            onClick={() => createListMutation.mutate({ name: newListName.trim() })}
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Popover>
    </Box>
  );
}
