"use client";

import { useState } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import TerrainIcon from "@mui/icons-material/Terrain";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

function SuggestedFollows() {
  const { data: suggestions, isLoading } = trpc.user.suggestedFollows.useQuery({ limit: 8 });
  const utils = trpc.useUtils();

  const followMutation = trpc.user.follow.useMutation({
    onSuccess: () => utils.user.suggestedFollows.invalidate(),
  });

  if (isLoading) {
    return (
      <Box mt={4}>
        <Typography variant="subtitle1" fontWeight={700} mb={1.5}>People you might know</Typography>
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Box key={i} sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", borderBottom: i < 2 ? "1px solid" : "none", borderColor: "divider" }}>
              <Skeleton variant="circular" width={44} height={44} />
              <Box sx={{ flex: 1 }}><Skeleton variant="text" width="40%" /><Skeleton variant="text" width="25%" /></Box>
              <Skeleton variant="rounded" width={72} height={32} />
            </Box>
          ))}
        </Paper>
      </Box>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <Box mt={4}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
        <PersonAddIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>People you might know</Typography>
      </Stack>
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {suggestions.map((user, i) => (
          <Box key={user.id}>
            <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center" }}>
              <Avatar
                component={NextLink}
                href={`/users/${user.id}`}
                src={user.avatar ?? undefined}
                sx={{ width: 44, height: 44, fontWeight: 700, textDecoration: "none", cursor: "pointer" }}
              >
                {!user.avatar && initials(user.name, user.email)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  component={NextLink}
                  href={`/users/${user.id}`}
                  fontWeight={600}
                  noWrap
                  sx={{ textDecoration: "none", color: "text.primary", "&:hover": { color: "primary.main" } }}
                >
                  {user.name ?? user.email.split("@")[0]}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TerrainIcon sx={{ fontSize: "0.8rem", color: "text.secondary" }} />
                  <Typography variant="caption" color="text.secondary">
                    {user.sharedPeaks} peak{user.sharedPeaks !== 1 ? "s" : ""} in common
                  </Typography>
                </Stack>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => followMutation.mutate({ userId: user.id })}
                disabled={followMutation.isPending}
                sx={{ borderRadius: 2, whiteSpace: "nowrap" }}
              >
                Follow
              </Button>
            </Box>
            {i < suggestions.length - 1 && <Divider />}
          </Box>
        ))}
      </Paper>
    </Box>
  );
}

export default function UserSearchPage() {
  const { accessToken } = useAuth();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const { data: results, isLoading } = trpc.user.search.useQuery(
    { query: trimmed },
    { enabled: trimmed.length >= 2, staleTime: 10_000 }
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader />
      <Box sx={{ maxWidth: 600, mx: "auto", px: { xs: 2, md: 4 }, py: 5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <PeopleIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Find Climbers</Typography>
        </Stack>

        <TextField
          fullWidth
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {trimmed.length < 2 ? (
          <>
            <Box sx={{ textAlign: "center", py: 4 }}>
              <SearchIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1 }} />
              <Typography color="text.secondary">Type at least 2 characters to search</Typography>
            </Box>
            {accessToken && <SuggestedFollows />}
          </>
        ) : isLoading ? (
          <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Box key={i} sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", borderBottom: "1px solid", borderColor: "divider" }}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="35%" />
                  <Skeleton variant="text" width="55%" />
                </Box>
              </Box>
            ))}
          </Paper>
        ) : !results || results.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <PeopleIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1 }} />
            <Typography color="text.secondary">No climbers found for &ldquo;{trimmed}&rdquo;</Typography>
          </Box>
        ) : (
          <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
            {results.map((user) => (
              <Box
                key={user.id}
                component={NextLink}
                href={`/users/${user.id}`}
                sx={{
                  p: 2, display: "flex", gap: 2, alignItems: "center",
                  textDecoration: "none", color: "inherit",
                  borderBottom: "1px solid", borderColor: "divider",
                  "&:last-child": { borderBottom: "none" },
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Avatar src={user.avatar ?? undefined} sx={{ width: 44, height: 44, fontWeight: 700 }}>
                  {!user.avatar && initials(user.name, user.email)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap>
                    {user.name ?? user.email.split("@")[0]}
                  </Typography>
                  {user.bio && (
                    <Typography variant="body2" color="text.secondary" noWrap>{user.bio}</Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Paper>
        )}
      </Box>
    </Box>
  );
}
