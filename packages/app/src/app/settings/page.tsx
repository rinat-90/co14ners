"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

// ── Change Email ───────────────────────────────────────────────────────────────

function ChangeEmailSection() {
  const utils = trpc.useUtils();
  const { setUser } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const mutation = trpc.user.updateEmail.useMutation({
    onSuccess: (updated) => {
      setUser({ ...updated, name: updated.name ?? null });
      utils.user.me.invalidate();
      setSuccess(true);
      setNewEmail("");
      setPassword("");
    },
  });

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <EmailIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>Change Email</Typography>
      </Stack>
      <Stack spacing={2}>
        <TextField
          label="New email address"
          type="email"
          value={newEmail}
          onChange={(e) => { setNewEmail(e.target.value); setSuccess(false); }}
          fullWidth
        />
        <TextField
          label="Current password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setSuccess(false); }}
          fullWidth
        />
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        {success && <Alert severity="success">Email updated successfully.</Alert>}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            disabled={!newEmail || !password || mutation.isPending}
            onClick={() => mutation.mutate({ newEmail, currentPassword: password })}
          >
            {mutation.isPending ? "Saving…" : "Update Email"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

// ── Change Password ────────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);

  const mismatch = next && confirm && next !== confirm;

  const mutation = trpc.user.updatePassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    },
  });

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <LockIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>Change Password</Typography>
      </Stack>
      <Stack spacing={2}>
        <TextField
          label="Current password"
          type="password"
          value={current}
          onChange={(e) => { setCurrent(e.target.value); setSuccess(false); }}
          fullWidth
        />
        <Divider />
        <TextField
          label="New password"
          type="password"
          value={next}
          onChange={(e) => { setNext(e.target.value); setSuccess(false); }}
          helperText="Minimum 8 characters"
          fullWidth
        />
        <TextField
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setSuccess(false); }}
          error={!!mismatch}
          helperText={mismatch ? "Passwords do not match" : ""}
          fullWidth
        />
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        {success && <Alert severity="success">Password updated successfully.</Alert>}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            disabled={!current || next.length < 8 || next !== confirm || mutation.isPending}
            onClick={() => mutation.mutate({ currentPassword: current, newPassword: next })}
          >
            {mutation.isPending ? "Saving…" : "Update Password"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  if (!accessToken && typeof window !== "undefined") {
    router.push("/login?redirect=/settings");
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader />
      <Box sx={{ maxWidth: 600, mx: "auto", px: { xs: 2, md: 4 }, py: 5 }}>
        <Typography variant="h4" fontWeight={700} mb={4}>
          Settings
        </Typography>
        <Stack spacing={3}>
          <ChangeEmailSection />
          <ChangePasswordSection />
        </Stack>
      </Box>
    </Box>
  );
}
