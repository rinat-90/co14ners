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

export function LoginForm({ redirect }: { redirect?: string }) {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = trpc.auth.login.useMutation({
    onSuccess(data) {
      setTokens(data.accessToken, data.refreshToken);
      router.push(redirect ?? "/");
    },
    onError(err) {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate({ email, password });
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" fontWeight={700} textAlign="center">
        Welcome back
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Sign in to track your summits
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

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
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Link component={NextLink} href="/forgot-password" variant="body2" alignSelf="flex-end">
        Forgot password?
      </Link>

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={login.isPending}
        startIcon={login.isPending ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>

      <Typography variant="body2" textAlign="center">
        Don&apos;t have an account?{" "}
        <Link component={NextLink} href="/register">
          Register
        </Link>
      </Typography>
    </Box>
  );
}
