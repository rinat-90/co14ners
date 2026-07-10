"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import TerrainIcon from "@mui/icons-material/Terrain";
import DifficultyChip from "@/components/mountains/DifficultyChip";
import { trpc } from "@/lib/trpc";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce 250ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Clear on close
  useEffect(() => {
    if (!open) { setQuery(""); setDebouncedQuery(""); }
    else setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const enabled = debouncedQuery.length >= 1;

  const { data: mountains, isFetching: fetchingMountains } = trpc.mountain.search.useQuery(
    { query: debouncedQuery },
    { enabled, placeholderData: (prev) => prev }
  );
  const { data: users, isFetching: fetchingUsers } = trpc.user.search.useQuery(
    { query: debouncedQuery },
    { enabled, placeholderData: (prev) => prev }
  );

  const loading = fetchingMountains || fetchingUsers;
  const hasResults = (mountains?.length ?? 0) > 0 || (users?.length ?? 0) > 0;

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: 3, mt: { xs: 4, md: 8 }, verticalAlign: "top" } } }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search mountains or climbers…"
          fullWidth
          variant="standard"
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start" sx={{ ml: 2, mr: 0 }}>
                  {loading ? <CircularProgress size={20} /> : <SearchIcon color="action" />}
                </InputAdornment>
              ),
              sx: { px: 1, py: 1.5, fontSize: "1.05rem" },
            },
          }}
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        />

        {enabled && (
          <>
            <Divider />
            {!hasResults && !loading ? (
              <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">No results for &ldquo;{debouncedQuery}&rdquo;</Typography>
              </Box>
            ) : (
              <List dense disablePadding sx={{ maxHeight: 420, overflowY: "auto" }}>
                {(mountains?.length ?? 0) > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1.5, pb: 0.5, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Mountains
                    </Typography>
                    {mountains!.map((m) => (
                      <ListItemButton
                        key={m.id}
                        onClick={() => navigate(`/mountains/${toSlug(m.name)}`)}
                        sx={{ px: 2, py: 1 }}
                      >
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <TerrainIcon color="primary" fontSize="small" />
                        </ListItemAvatar>
                        <ListItemText
                          primary={m.name}
                          secondary={`${m.altitude.toLocaleString()} ft`}
                          primaryTypographyProps={{ fontWeight: 600, variant: "body2" }}
                          secondaryTypographyProps={{ variant: "caption" }}
                        />
                        <DifficultyChip difficulty={m.difficulty as "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5"} size="small" />
                      </ListItemButton>
                    ))}
                  </>
                )}

                {(users?.length ?? 0) > 0 && (
                  <>
                    {(mountains?.length ?? 0) > 0 && <Divider sx={{ my: 0.5 }} />}
                    <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1.5, pb: 0.5, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Climbers
                    </Typography>
                    {users!.map((u) => (
                      <ListItemButton
                        key={u.id}
                        onClick={() => navigate(`/users/${u.id}`)}
                        sx={{ px: 2, py: 1 }}
                      >
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <Avatar src={u.avatar ?? undefined} sx={{ width: 28, height: 28, fontSize: 11 }}>
                            {!u.avatar && (u.name ?? u.email).slice(0, 2).toUpperCase()}
                            {!u.avatar && !u.name && !u.email && <PersonIcon fontSize="small" />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={u.name ?? u.email.split("@")[0]}
                          secondary={u.bio?.slice(0, 60) || undefined}
                          primaryTypographyProps={{ fontWeight: 600, variant: "body2" }}
                          secondaryTypographyProps={{ variant: "caption", noWrap: true }}
                        />
                      </ListItemButton>
                    ))}
                  </>
                )}
              </List>
            )}
          </>
        )}

        {!enabled && (
          <Box sx={{ px: 3, py: 3 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Search all 58 Colorado 14ers and registered climbers
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
