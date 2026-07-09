"use client";

import { useState } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import AppHeader from "@/components/AppHeader";
import { trpc } from "@/lib/trpc";

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

export default function UserSearchPage() {
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
          <Box sx={{ textAlign: "center", py: 6 }}>
            <SearchIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1 }} />
            <Typography color="text.secondary">Type at least 2 characters to search</Typography>
          </Box>
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
