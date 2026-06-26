"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { trpc } from "@/lib/trpc";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotPassword = trpc.auth.forgotPassword.useMutation({
    onSuccess() {
      setSubmitted(true);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    forgotPassword.mutate({ email });
  }

  if (submitted) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center">
          Check your email
        </Typography>
        <Alert severity="success">
          If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset
          link shortly.
        </Alert>
        <Link component={NextLink} href="/login" variant="body2" textAlign="center">
          Back to sign in
        </Link>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" fontWeight={700} textAlign="center">
        Forgot your password?
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Enter your email and we&apos;ll send you a reset link.
      </Typography>

      {forgotPassword.error && <Alert severity="error">{forgotPassword.error.message}</Alert>}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={forgotPassword.isPending}
        startIcon={forgotPassword.isPending ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {forgotPassword.isPending ? "Sending…" : "Send reset link"}
      </Button>

      <Link component={NextLink} href="/login" variant="body2" textAlign="center">
        Back to sign in
      </Link>
    </Box>
  );
}
