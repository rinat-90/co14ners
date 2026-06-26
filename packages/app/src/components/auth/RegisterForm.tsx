"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

export function RegisterForm() {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const register = trpc.auth.register.useMutation({
    onSuccess(data) {
      setTokens(data.accessToken, data.refreshToken);
      router.push("/");
    },
    onError(err) {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    register.mutate({ name: name || undefined, email, password });
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" fontWeight={700} textAlign="center">
        Create your account
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Start logging your 14er summits
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        helperText="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        label="Confirm password"
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
        disabled={register.isPending}
        startIcon={register.isPending ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {register.isPending ? "Creating account…" : "Create account"}
      </Button>

      <Typography variant="body2" textAlign="center">
        Already have an account?{" "}
        <Link component={NextLink} href="/login">
          Sign in
        </Link>
      </Typography>
    </Box>
  );
}
