"use client";

import { use, useState } from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import TerrainIcon from "@mui/icons-material/Terrain";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function EditListDialog({
  open, onClose, list,
}: {
  open: boolean;
  onClose: () => void;
  list: { id: string; name: string; description: string | null; isPublic: boolean };
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(list.name);
  const [desc, setDesc] = useState(list.description ?? "");
  const [isPublic, setIsPublic] = useState(list.isPublic);

  const mutation = trpc.list.update.useMutation({
    onSuccess: () => {
      utils.list.get.invalidate({ id: list.id });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>Edit list</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={0.5}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputProps={{ maxLength: 80 }}
            fullWidth
            autoFocus
          />
          <TextField
            label="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            inputProps={{ maxLength: 300 }}
            multiline
            rows={2}
            fullWidth
          />
          <FormControlLabel
            control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
            label={isPublic ? "Public" : "Private"}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || mutation.isPending}
          onClick={() => mutation.mutate({ id: list.id, name: name.trim(), description: desc.trim() || null, isPublic })}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [editOpen, setEditOpen] = useState(searchParams.get("edit") === "1");

  const { data: list, isLoading } = trpc.list.get.useQuery({ id });

  const removeMutation = trpc.list.removeMountain.useMutation({
    onSuccess: () => utils.list.get.invalidate({ id }),
  });
  const deleteListMutation = trpc.list.delete.useMutation({
    onSuccess: () => router.push("/lists"),
  });

  const isOwner = !!user && list?.userId === user.id;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />
      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>
        <Button
          component={NextLink}
          href="/lists"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3, color: "text.secondary" }}
        >
          My lists
        </Button>

        {isLoading ? (
          <Stack spacing={2}>
            <Skeleton variant="text" width="40%" height={40} />
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          </Stack>
        ) : !list ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography color="text.secondary">List not found.</Typography>
          </Box>
        ) : (
          <>
            {/* Header */}
            <Stack direction="row" alignItems="flex-start" spacing={2} mb={3} flexWrap="wrap" gap={1}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                  <PlaylistAddCheckIcon color="primary" />
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>
                    {list.name}
                  </Typography>
                  <Chip
                    icon={list.isPublic ? <PublicIcon /> : <LockIcon />}
                    label={list.isPublic ? "Public" : "Private"}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Stack>
                {list.description && (
                  <Typography variant="body1" color="text.secondary">{list.description}</Typography>
                )}
                <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
                  By {list.user.name ?? list.user.email.split("@")[0]} · {list.items.length} peak{list.items.length !== 1 ? "s" : ""}
                </Typography>
              </Box>
              {isOwner && (
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Edit list">
                    <IconButton onClick={() => setEditOpen(true)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete list">
                    <IconButton
                      color="error"
                      onClick={() => {
                        if (confirm(`Delete "${list.name}"? This cannot be undone.`)) {
                          deleteListMutation.mutate({ id: list.id });
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>

            {/* Mountains */}
            {list.items.length === 0 ? (
              <Paper sx={{ borderRadius: 3, py: 8, textAlign: "center" }}>
                <TerrainIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
                <Typography variant="h6" color="text.secondary" fontWeight={500}>No peaks yet</Typography>
                <Typography variant="body2" color="text.disabled" mt={0.5}>
                  Open any 14er and tap the list icon to add it here.
                </Typography>
                <Button component={NextLink} href="/mountains" variant="outlined" sx={{ mt: 2 }}>
                  Browse 14ers
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {list.items.map(({ mountain }) => (
                  <Grid key={mountain.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                      sx={{ borderRadius: 3, overflow: "hidden", display: "flex", flexDirection: "column" }}
                    >
                      {/* Mini hero */}
                      <Box
                        component={NextLink}
                        href={`/mountains/${toSlug(mountain.name)}`}
                        sx={{
                          height: 100,
                          background: mountain.imageUrl
                            ? `linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.5)), url(${mountain.imageUrl}) center/cover`
                            : "linear-gradient(135deg,#1e3a8a,#15803d)",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "flex-end",
                          px: 1.5,
                          pb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700} color="white" noWrap>
                          {mountain.name}
                        </Typography>
                      </Box>
                      <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Chip label={`${mountain.altitude.toLocaleString()} ft`} size="small" variant="outlined" />
                        <DifficultyChip difficulty={mountain.difficulty} size="small" />
                        <Box sx={{ flex: 1 }} />
                        {isOwner && (
                          <Tooltip title="Remove from list">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeMutation.mutate({ listId: list.id, mountainId: mountain.id })}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}

            {isOwner && editOpen && (
              <EditListDialog open={editOpen} onClose={() => setEditOpen(false)} list={list} />
            )}
          </>
        )}
      </Box>
      <BottomNav />
    </Box>
  );
}
