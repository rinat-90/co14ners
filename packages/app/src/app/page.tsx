"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { accessToken, logout, isLoading } = useAuth();

  const me = trpc.auth.me.useQuery(undefined, {
    enabled: !!accessToken,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.push("/login");
    }
  }, [isLoading, accessToken, router]);

  if (isLoading || me.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const user = me.data;

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={800} color="primary">
          co14ners
        </Typography>
        <Button variant="outlined" onClick={logout}>
          Sign out
        </Button>
      </Box>

      <Typography variant="h5" gutterBottom>
        Welcome back{user?.name ? `, ${user.name}` : ""}! 🏔️
      </Typography>
      <Typography color="text.secondary">
        You&apos;re signed in as <strong>{user?.email}</strong> ({user?.role})
      </Typography>
    </Box>
  );
}
