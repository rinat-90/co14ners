"use client";

import { use } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArticleIcon from "@mui/icons-material/Article";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import TerrainIcon from "@mui/icons-material/Terrain";
import AppHeader from "@/components/AppHeader";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

// ── helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function timeAgo(date: Date | string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function displayName(name: string | null | undefined, email: string) {
  return name ?? email.split("@")[0];
}

const CONDITIONS: Record<string, { label: string; color: "success" | "info" | "warning" | "error" }> = {
  EXCELLENT: { label: "Excellent", color: "success" },
  GOOD:      { label: "Good",      color: "info" },
  FAIR:      { label: "Fair",      color: "warning" },
  POOR:      { label: "Poor",      color: "error" },
};

// ── Comments ──────────────────────────────────────────────────────────────────

function CommentThread({ tripReportId }: { tripReportId: string }) {
  const { accessToken, user } = useAuth();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const { data: comments, isLoading } = trpc.comment.list.useQuery(
    { tripReportId },
    { enabled: open },
  );

  const addMutation = trpc.comment.add.useMutation({
    onSuccess: () => { utils.comment.list.invalidate({ tripReportId }); setDraft(""); },
  });

  const deleteMutation = trpc.comment.delete.useMutation({
    onSuccess: () => utils.comment.list.invalidate({ tripReportId }),
  });

  return (
    <Box>
      <Button
        size="small"
        startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
        onClick={() => setOpen((v) => !v)}
        sx={{ textTransform: "none", fontWeight: 500 }}
      >
        {open ? "Hide comments" : `Comments${comments && comments.length > 0 ? ` (${comments.length})` : ""}`}
      </Button>

      <Collapse in={open}>
        <Box mt={1.5}>
          {isLoading ? (
            <CircularProgress size={20} />
          ) : comments?.length === 0 ? (
            <Typography variant="caption" color="text.disabled">No comments yet.</Typography>
          ) : (
            <Stack spacing={1.5} mb={1.5}>
              {comments?.map((c) => (
                <Stack key={c.id} direction="row" spacing={1.5} alignItems="flex-start">
                  <Avatar
                    src={c.user.avatar ?? undefined}
                    sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: "secondary.main", flexShrink: 0 }}
                  >
                    {!c.user.avatar && displayName(c.user.name, c.user.email).slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, bgcolor: "action.hover", borderRadius: 2, px: 1.5, py: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                      <Typography
                        component={NextLink}
                        href={`/users/${c.user.id}`}
                        variant="caption"
                        fontWeight={700}
                        sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                      >
                        {displayName(c.user.name, c.user.email)}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">{timeAgo(c.createdAt)}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{c.body}</Typography>
                  </Box>
                  {user?.id === c.userId && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteMutation.mutate({ id: c.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Stack>
          )}

          {accessToken ? (
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                multiline
                minRows={1}
                maxRows={4}
                size="small"
                fullWidth
                placeholder="Add a comment…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={addMutation.isPending}
              />
              <IconButton
                color="primary"
                disabled={!draft.trim() || addMutation.isPending}
                onClick={() => addMutation.mutate({ tripReportId, body: draft.trim() })}
              >
                {addMutation.isPending ? <CircularProgress size={18} /> : <SendIcon />}
              </IconButton>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">
              <NextLink href="/login" style={{ color: "inherit" }}>Sign in</NextLink> to comment.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

import { useState } from "react";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: report, isLoading, error } = trpc.tripReport.get.useQuery({ id });

  const mountainSlug = report ? toSlug(report.mountain.name) : "";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />

      <Box sx={{ maxWidth: 760, mx: "auto", px: { xs: 2, md: 4 }, pt: 3 }}>
        {/* Back link */}
        {!isLoading && !error && report && (
          <Button
            component={NextLink}
            href={`/mountains/${mountainSlug}`}
            startIcon={<ArrowBackIcon />}
            size="small"
            sx={{ mb: 2, textTransform: "none" }}
          >
            {report.mountain.name}
          </Button>
        )}

        {isLoading ? (
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="35%" />
            <Skeleton variant="rounded" height={200} />
          </Stack>
        ) : error ? (
          <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
            <ArticleIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" gutterBottom>Report not found</Typography>
            <Typography color="text.secondary" mb={3}>This report may have been deleted or made private.</Typography>
            <Button component={NextLink} href="/mountains" variant="contained">Browse 14ers</Button>
          </Paper>
        ) : report ? (
          <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3 }}>
            {/* Mountain + difficulty */}
            <Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap" useFlexGap>
              <TerrainIcon sx={{ color: "primary.main" }} />
              <Typography
                component={NextLink}
                href={`/mountains/${mountainSlug}`}
                variant="subtitle1"
                fontWeight={700}
                sx={{ textDecoration: "none", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
              >
                {report.mountain.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {report.mountain.altitude.toLocaleString()} ft
              </Typography>
              <DifficultyChip difficulty={report.mountain.difficulty as "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5"} />
              {report.conditions && CONDITIONS[report.conditions] && (
                <Chip
                  label={CONDITIONS[report.conditions].label}
                  size="small"
                  color={CONDITIONS[report.conditions].color}
                  variant="outlined"
                />
              )}
            </Stack>

            {/* Title */}
            <Typography variant="h5" fontWeight={700} mb={1.5} sx={{ lineHeight: 1.3 }}>
              {report.title}
            </Typography>

            {/* Author + meta */}
            <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5} flexWrap="wrap" useFlexGap>
              <Avatar
                src={report.user.avatar ?? undefined}
                component={NextLink}
                href={`/users/${report.user.id}`}
                sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: "primary.main", textDecoration: "none" }}
              >
                {!report.user.avatar && displayName(report.user.name, report.user.email).slice(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography
                  component={NextLink}
                  href={`/users/${report.user.id}`}
                  variant="body2"
                  fontWeight={600}
                  sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                >
                  {displayName(report.user.name, report.user.email)}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {timeAgo(report.createdAt)}
                  {report.trail && ` · via ${report.trail.name}`}
                </Typography>
              </Box>
            </Stack>

            {/* Photo */}
            {report.photoUrl && (
              <Box
                component="img"
                src={report.photoUrl}
                alt="Trip photo"
                sx={{
                  width: "100%",
                  maxHeight: 420,
                  objectFit: "cover",
                  borderRadius: 2,
                  mb: 2.5,
                  display: "block",
                }}
              />
            )}

            <Divider sx={{ mb: 2.5 }} />

            {/* Body */}
            <Typography
              variant="body1"
              sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "text.primary" }}
            >
              {report.body}
            </Typography>

            <Divider sx={{ mt: 3, mb: 2 }} />

            {/* Comments */}
            <CommentThread tripReportId={report.id} />
          </Paper>
        ) : null}
      </Box>
    </Box>
  );
}
