"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import Switch from "@mui/material/Switch";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { useThemeMode } from "@/lib/theme-context";
import { trpc } from "@/lib/trpc";

// ── Avatar helpers ─────────────────────────────────────────────────────────────

function resizeImageToDataUrl(file: File, size = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // Center-crop to square
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Avatar Section ─────────────────────────────────────────────────────────────

function AvatarSection() {
  const utils = trpc.useUtils();
  const { user: authUser, setUser } = useAuth();
  const { data: me } = trpc.user.me.useQuery();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = trpc.user.updateProfile.useMutation({
    onSuccess: (updated) => {
      utils.user.me.invalidate();
      if (authUser) setUser({ ...authUser, avatar: updated.avatar ?? null });
      setPreview(null);
    },
    onError: (e) => setError(e.message),
  });

  const currentAvatar = preview ?? me?.avatar ?? null;
  const displayName = me?.name ?? authUser?.email?.split("@")[0] ?? "?";

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }
    try {
      const dataUrl = await resizeImageToDataUrl(file, 200);
      setPreview(dataUrl);
      mutation.mutate({ avatar: dataUrl });
    } catch {
      setError("Could not process image.");
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5}>
        <CameraAltIcon color="primary" />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Profile Photo</Typography>
      </Stack>

      <Stack direction="row" spacing={3} alignItems="center">
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={currentAvatar ?? undefined}
            sx={{ width: 80, height: 80, fontSize: 28, fontWeight: 700, bgcolor: "primary.main" }}
          >
            {!currentAvatar && displayName.slice(0, 2).toUpperCase()}
          </Avatar>
          {mutation.isPending && (
            <CircularProgress
              size={84}
              sx={{ position: "absolute", top: -2, left: -2, color: "primary.main", zIndex: 1 }}
            />
          )}
        </Box>

        <Stack spacing={1} flex={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="outlined"
              startIcon={<CameraAltIcon />}
              onClick={() => fileRef.current?.click()}
              disabled={mutation.isPending}
              sx={{ borderRadius: 2 }}
            >
              {currentAvatar ? "Change photo" : "Upload photo"}
            </Button>
            {me?.avatar && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => mutation.mutate({ avatar: null })}
                disabled={mutation.isPending}
                sx={{ borderRadius: 2 }}
              >
                Remove
              </Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            JPG, PNG or WebP · max 5 MB · cropped to square
          </Typography>
          {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
        </Stack>
      </Stack>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </Paper>
  );
}

// ── Appearance ─────────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { mode, toggle } = useThemeMode();

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <DarkModeIcon color="primary" />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Appearance</Typography>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="body1" fontWeight={500}>Dark mode</Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === "dark" ? "Using dark theme" : "Using light theme"}
          </Typography>
        </Box>
        <Switch checked={mode === "dark"} onChange={toggle} />
      </Stack>
    </Paper>
  );
}

// ── Edit Profile ───────────────────────────────────────────────────────────────

function EditProfileSection() {
  const utils = trpc.useUtils();
  const { user: authUser, setUser } = useAuth();
  const { data: me } = trpc.user.me.useQuery();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [success, setSuccess] = useState(false);

  // Pre-fill from server data once loaded
  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setBio(me.bio ?? "");
    }
  }, [me]);

  const mutation = trpc.user.updateProfile.useMutation({
    onSuccess: (updated) => {
      utils.user.me.invalidate();
      if (authUser) setUser({ ...authUser, name: updated.name ?? null });
      setSuccess(true);
    },
  });

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <PersonIcon color="primary" />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Edit Profile</Typography>
      </Stack>
      <Stack spacing={2}>
        <TextField
          label="Display name"
          value={name}
          onChange={(e) => { setName(e.target.value); setSuccess(false); }}
          fullWidth
          inputProps={{ maxLength: 80 }}
          helperText="How your name appears to other users"
        />
        <TextField
          label="Bio"
          value={bio}
          onChange={(e) => { setBio(e.target.value); setSuccess(false); }}
          multiline
          rows={3}
          fullWidth
          inputProps={{ maxLength: 300 }}
          helperText={`${bio.length}/300`}
        />
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        {success && <Alert severity="success">Profile updated.</Alert>}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ name: name.trim() || undefined, bio: bio.trim() })}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

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
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <EmailIcon color="primary" />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Change Email</Typography>
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
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <LockIcon color="primary" />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Change Password</Typography>
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
        <Typography variant="h4" fontWeight={700} mb={4} sx={{ fontSize: { xs: "1.5rem", md: "2.125rem" } }}>
          Settings
        </Typography>
        <Stack spacing={3}>
          <AvatarSection />
          <AppearanceSection />
          <EditProfileSection />
          <ChangeEmailSection />
          <ChangePasswordSection />
        </Stack>
      </Box>
    </Box>
  );
}
