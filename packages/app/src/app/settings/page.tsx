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
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { useThemeMode } from "@/lib/theme-context";
import { trpc } from "@/lib/trpc";
import { subscribeToPush, unsubscribeFromPush, getPushPermission } from "@/lib/push";

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

// ── Email Notifications Section ────────────────────────────────────────────────

function EmailNotificationsSection() {
  const utils = trpc.useUtils();
  const { data: prefs, isLoading } = trpc.user.notifPrefs.useQuery();

  const mutation = trpc.user.updateNotifPrefs.useMutation({
    onSuccess: () => utils.user.notifPrefs.invalidate(),
  });

  function toggle(field: "emailOnFollow" | "emailOnComment" | "emailOnReview") {
    if (!prefs) return;
    mutation.mutate({ [field]: !prefs[field] });
  }

  const rows: { field: "emailOnFollow" | "emailOnComment" | "emailOnReview"; label: string; description: string }[] = [
    { field: "emailOnFollow", label: "New followers", description: "When someone starts following you" },
    { field: "emailOnComment", label: "Comments on your reports", description: "When someone comments on your trip report" },
    { field: "emailOnReview", label: "Reviews on peaks you've summited", description: "When someone reviews a mountain you've climbed" },
  ];

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <EmailOutlinedIcon color="primary" />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Email Notifications</Typography>
      </Stack>
      {isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Stack divider={<Divider />}>
          {rows.map(({ field, label, description }) => (
            <Stack key={field} direction="row" alignItems="center" justifyContent="space-between" py={1.25}>
              <Box>
                <Typography variant="body1" fontWeight={500}>{label}</Typography>
                <Typography variant="body2" color="text.secondary">{description}</Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs?.[field] ?? true}
                    onChange={() => toggle(field)}
                    disabled={mutation.isPending}
                  />
                }
                label=""
                sx={{ mr: 0 }}
              />
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

// ── Push Notifications Section ─────────────────────────────────────────────────

function PushNotificationsSection() {
  const utils = trpc.useUtils();
  const { data: vapidData } = trpc.push.vapidKey.useQuery();
  const { data: subData, isLoading } = trpc.push.isSubscribed.useQuery();
  const subscribeMutation = trpc.push.subscribe.useMutation({ onSuccess: () => utils.push.isSubscribed.invalidate() });
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation({ onSuccess: () => utils.push.isSubscribed.invalidate() });

  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
  const subscribed = subData?.subscribed ?? false;

  async function handleEnable() {
    if (!vapidData?.publicKey) return;
    setWorking(true);
    setError(null);
    try {
      const perm = await getPushPermission();
      setPermission(perm);
      if (perm !== "granted") { setError("Permission denied. Allow notifications in your browser settings."); return; }
      const sub = await subscribeToPush(vapidData.publicKey);
      if (!sub) { setError("Could not create subscription."); return; }
      const json = sub.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: sub.endpoint,
        p256dh: (json.keys as Record<string, string>).p256dh,
        auth: (json.keys as Record<string, string>).auth,
      });
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to enable notifications.");
    } finally {
      setWorking(false);
    }
  }

  async function handleDisable() {
    setWorking(true);
    setError(null);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await unsubscribeMutation.mutateAsync({ endpoint });
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to disable notifications.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <NotificationsIcon color="primary" />
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}>Push Notifications</Typography>
      </Stack>

      {!supported ? (
        <Alert severity="info">Push notifications are not supported in this browser.</Alert>
      ) : permission === "denied" ? (
        <Alert severity="warning">
          Notifications are blocked. Enable them in your browser&apos;s site settings, then reload this page.
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Get browser notifications for new followers, comments on your reports, and reviews on peaks you&apos;ve summited — even when the tab is closed.
          </Typography>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <Box>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : subscribed ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <Alert severity="success" icon={<NotificationsIcon />} sx={{ flex: 1, py: 0.5 }}>
                  Push notifications are enabled on this device.
                </Alert>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<NotificationsOffIcon />}
                  onClick={handleDisable}
                  disabled={working}
                >
                  Disable
                </Button>
              </Stack>
            ) : (
              <Button
                variant="contained"
                startIcon={working ? <CircularProgress size={16} color="inherit" /> : <NotificationsIcon />}
                onClick={handleEnable}
                disabled={working}
              >
                Enable push notifications
              </Button>
            )}
          </Box>
        </Stack>
      )}
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
          <PushNotificationsSection />
          <EmailNotificationsSection />
          <EditProfileSection />
          <ChangeEmailSection />
          <ChangePasswordSection />
        </Stack>
      </Box>
    </Box>
  );
}
