"use client";

import { use } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import AppHeader from "@/components/AppHeader";
import { trpc } from "@/lib/trpc";

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

export default function FollowingPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { data: profile } = trpc.user.publicProfile.useQuery({ userId });
  const { data: following, isLoading } = trpc.user.following.useQuery({ userId });

  const displayName = profile?.user.name ?? profile?.user.email?.split("@")[0] ?? "User";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader />
      <Box sx={{ maxWidth: 600, mx: "auto", px: { xs: 2, md: 4 }, py: 5 }}>
        <Button
          component={NextLink}
          href={`/users/${userId}`}
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Back to profile
        </Button>

        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <PersonIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            {isLoading ? "Following" : `${displayName} is following`}
          </Typography>
        </Stack>

        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", borderBottom: "1px solid", borderColor: "divider" }}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              </Box>
            ))
          ) : !following || following.length === 0 ? (
            <Box sx={{ p: 5, textAlign: "center" }}>
              <PersonIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography color="text.secondary">Not following anyone yet.</Typography>
            </Box>
          ) : (
            following.map((user) => (
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
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {user.bio}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Box>
  );
}
