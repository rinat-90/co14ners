"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { trpc } from "@/lib/trpc";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess() {
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    },
    onError(err) {
      setError(err.message);
    },
  });

  if (!token) {
    return (
      <Alert severity="error">
        Invalid reset link. Please request a new one from the{" "}
        <Link component={NextLink} href="/forgot-password">
          forgot password
        </Link>{" "}
        page.
      </Alert>
    );
  }

  if (done) {
    return (
      <Alert severity="success">
        Password updated! Redirecting you to sign in…
      </Alert>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    resetPassword.mutate({ token, password });
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" fontWeight={700} textAlign="center">
        Set a new password
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        helperText="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={resetPassword.isPending}
        startIcon={resetPassword.isPending ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {resetPassword.isPending ? "Updating…" : "Update password"}
      </Button>
    </Box>
  );
}
