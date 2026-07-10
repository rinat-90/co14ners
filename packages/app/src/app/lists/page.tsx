"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import TerrainIcon from "@mui/icons-material/Terrain";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

function CreateListDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const mutation = trpc.list.create.useMutation({
    onSuccess: () => {
      utils.list.myLists.invalidate();
      setName(""); setDesc(""); setIsPublic(true);
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>New list</DialogTitle>
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
            label={isPublic ? "Public — visible on your profile" : "Private — only you can see it"}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || mutation.isPending}
          onClick={() => mutation.mutate({ name: name.trim(), description: desc.trim() || undefined, isPublic })}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ListCard({ list, onDelete }: {
  list: {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    _count: { items: number };
    items: { mountain: { imageUrl: string | null; name: string } }[];
  };
  onDelete: (id: string) => void;
}) {
  const previews = list.items.map((i) => i.mountain);

  return (
    <Card sx={{ borderRadius: 3, height: "100%", display: "flex", flexDirection: "column" }}>
      <CardActionArea component={NextLink} href={`/lists/${list.id}`} sx={{ flex: 1 }}>
        {/* Preview strip */}
        <Box
          sx={{
            height: 96,
            display: "grid",
            gridTemplateColumns: previews.length >= 3 ? "1fr 1fr 1fr" : previews.length === 2 ? "1fr 1fr" : "1fr",
            overflow: "hidden",
            bgcolor: "action.hover",
          }}
        >
          {previews.length === 0 ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TerrainIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            </Box>
          ) : (
            previews.slice(0, 3).map((m, i) =>
              m.imageUrl ? (
                <Box
                  key={i}
                  sx={{
                    backgroundImage: `url(${m.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ) : (
                <Box
                  key={i}
                  sx={{ bgcolor: `hsl(${(i * 60 + 200) % 360}, 40%, 30%)`, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <TerrainIcon sx={{ color: "rgba(255,255,255,0.5)", fontSize: 28 }} />
                </Box>
              )
            )
          )}
        </Box>
        <CardContent sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <Typography fontWeight={700} sx={{ flex: 1 }} noWrap>{list.name}</Typography>
            {!list.isPublic && <LockIcon sx={{ fontSize: 16, color: "text.disabled" }} />}
          </Stack>
          {list.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {list.description}
            </Typography>
          )}
          <Chip
            icon={<TerrainIcon sx={{ fontSize: "14px !important" }} />}
            label={`${list._count.items} peak${list._count.items !== 1 ? "s" : ""}`}
            size="small"
            variant="outlined"
          />
        </CardContent>
      </CardActionArea>
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1.5, pb: 1, gap: 0.5 }}>
        <Tooltip title="Edit list">
          <IconButton size="small" component={NextLink} href={`/lists/${list.id}?edit=1`}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete list">
          <IconButton size="small" color="error" onClick={() => onDelete(list.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
}

export default function ListsPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: lists, isLoading } = trpc.list.myLists.useQuery(undefined, { enabled: !!accessToken });

  const deleteMutation = trpc.list.delete.useMutation({
    onSuccess: () => utils.list.myLists.invalidate(),
  });

  if (!accessToken && typeof window !== "undefined") {
    router.push("/login?redirect=/lists");
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />
      <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
          <PlaylistAddCheckIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, flex: 1 }}>
            My Lists
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New list
          </Button>
        </Stack>

        {isLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : !lists || lists.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <PlaylistAddCheckIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={500}>No lists yet</Typography>
            <Typography variant="body2" color="text.disabled" mt={0.5} mb={3}>
              Create lists to organise peaks by season, difficulty, or any goal you have in mind.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              Create your first list
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {lists.map((lst) => (
              <Grid key={lst.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <ListCard list={lst} onDelete={(id) => deleteMutation.mutate({ id })} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <CreateListDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <BottomNav />
    </Box>
  );
}
