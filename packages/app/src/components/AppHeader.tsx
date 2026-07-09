"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import GetAppIcon from "@mui/icons-material/GetApp";
import IosShareIcon from "@mui/icons-material/IosShare";
import LogoutIcon from "@mui/icons-material/Logout";
import MapIcon from "@mui/icons-material/Map";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonIcon from "@mui/icons-material/Person";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import SettingsIcon from "@mui/icons-material/Settings";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

function displayName(user: { name?: string | null; email: string } | null) {
  if (!user) return "Account";
  return user.name ?? user.email.split("@")[0];
}

function timeAgo(d: Date | string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationBell() {
  const { accessToken } = useAuth();
  const utils = trpc.useUtils();
  const { data: unread } = trpc.notification.unreadCount.useQuery(undefined, { enabled: !!accessToken, refetchInterval: 30000 });
  const { data: notifications } = trpc.notification.list.useQuery({ limit: 20 }, { enabled: !!accessToken });
  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });
  const markAllMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  function handleOpen(e: React.MouseEvent<HTMLElement>) {
    setAnchor(e.currentTarget);
    // Mark visible unread notifications as read
    const unreadIds = notifications?.filter((n: { read: boolean }) => !n.read).map((n: { id: string }) => n.id) ?? [];
    if (unreadIds.length > 0) markReadMutation.mutate({ ids: unreadIds });
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} size="small" color="inherit">
          <Badge badgeContent={unread?.count || 0} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{ paper: { sx: { mt: 1, width: 340, maxHeight: 480, borderRadius: 2 } } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography fontWeight={700}>Notifications</Typography>
          {(unread?.count ?? 0) > 0 && (
            <Button size="small" onClick={() => markAllMutation.mutate()} sx={{ fontSize: "0.75rem" }}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {!notifications || notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <NotificationsIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No notifications yet.</Typography>
          </Box>
        ) : (
          notifications.map((n: { id: string; type: string; actorId: string; read: boolean; createdAt: string; actor: { name?: string | null; email: string; avatar?: string | null }; mountain?: { name: string } | null }) => (
            <MenuItem
              key={n.id}
              component={NextLink}
              href={n.type === "FOLLOW"
                ? `/users/${n.actorId}`
                : `/mountains/${n.mountain?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
              onClick={() => setAnchor(null)}
              sx={{ alignItems: "flex-start", gap: 1.5, py: 1.5, bgcolor: n.read ? "transparent" : "action.selected" }}
            >
              <Avatar src={n.actor.avatar ?? undefined} sx={{ width: 36, height: 36, mt: 0.25, fontSize: 13, flexShrink: 0 }}>
                {!n.actor.avatar && (n.actor.name ?? n.actor.email).slice(0, 2).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                  {n.type === "FOLLOW" ? (
                    <><strong>{n.actor.name ?? n.actor.email.split("@")[0]}</strong> started following you</>
                  ) : n.type === "COMMENT_ON_REPORT" ? (
                    <><strong>{n.actor.name ?? n.actor.email.split("@")[0]}</strong> commented on your report for <strong>{n.mountain?.name}</strong></>
                  ) : (
                    <><strong>{n.actor.name ?? n.actor.email.split("@")[0]}</strong> reviewed <strong>{n.mountain?.name}</strong></>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">{timeAgo(n.createdAt)}</Typography>
              </Box>
              {n.type === "FOLLOW" && <PersonAddIcon fontSize="small" sx={{ color: "primary.main", mt: 0.5, flexShrink: 0 }} />}
              {n.type === "REVIEW_ON_SUMMIT" && <TerrainIcon fontSize="small" sx={{ color: "secondary.main", mt: 0.5, flexShrink: 0 }} />}
              {n.type === "COMMENT_ON_REPORT" && <ChatBubbleOutlineIcon fontSize="small" sx={{ color: "info.main", mt: 0.5, flexShrink: 0 }} />}
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
  return isIos && isSafari;
}

export default function AppHeader() {
  const { accessToken, user, logout } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    if (isIosSafari()) {
      setShowIosBanner(true);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      setInstallPrompt({ prompt: async () => {}, userChoice: Promise.resolve({ outcome: "accepted" }) } as BeforeInstallPromptEvent);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
    setShowIosBanner(false);
    setInstallPrompt(null);
  };

  const showChromeBanner = !!installPrompt && !dismissed;

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Toolbar sx={{ maxWidth: 1200, width: "100%", mx: "auto", px: { xs: 2, md: 4 } }}>
        <Box
          component={NextLink}
          href="/"
          sx={{ display: "flex", alignItems: "center", gap: 1, textDecoration: "none", color: "inherit", flexGrow: 1 }}
        >
          <TerrainIcon color="primary" />
          <Typography variant="h6" fontWeight={800} color="primary">
            co14ers
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            component={NextLink}
            href="/mountains"
            color="inherit"
            sx={{ fontWeight: 600, display: { xs: "none", md: "inline-flex" } }}
          >
            14ers
          </Button>
          <Button
            component={NextLink}
            href="/map"
            color="inherit"
            startIcon={<MapIcon />}
            sx={{ fontWeight: 600, display: { xs: "none", md: "inline-flex" } }}
          >
            Map
          </Button>
          <Button
            component={NextLink}
            href="/feed"
            color="inherit"
            startIcon={<DynamicFeedIcon />}
            sx={{ fontWeight: 600, display: { xs: "none", md: "inline-flex" } }}
          >
            Feed
          </Button>

          {accessToken ? (
            <>
              <NotificationBell />
              <Button
                startIcon={
                  user?.avatar
                    ? <Avatar src={user.avatar} sx={{ width: 24, height: 24 }} />
                    : <AccountCircleIcon />
                }
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                color="inherit"
                sx={{ fontWeight: 600, display: { xs: "none", md: "inline-flex" } }}
              >
                {displayName(user)}
              </Button>
              <Menu
                anchorEl={menuAnchor}
                open={!!menuAnchor}
                onClose={() => setMenuAnchor(null)}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 2 } } }}
              >
                <MenuItem
                  component={NextLink}
                  href="/profile"
                  onClick={() => setMenuAnchor(null)}
                >
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  Profile
                </MenuItem>
                <MenuItem
                  component={NextLink}
                  href="/users/search"
                  onClick={() => setMenuAnchor(null)}
                >
                  <ListItemIcon><PersonSearchIcon fontSize="small" /></ListItemIcon>
                  Find Climbers
                </MenuItem>
                <MenuItem
                  component={NextLink}
                  href="/settings"
                  onClick={() => setMenuAnchor(null)}
                >
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  Settings
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => { setMenuAnchor(null); logout(); }}
                  sx={{ color: "error.main" }}
                >
                  <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                  Sign out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button variant="contained" size="small" component={NextLink} href="/login">
              Sign in
            </Button>
          )}
        </Box>
      </Toolbar>

      {/* Chrome / Android install banner */}
      {showChromeBanner && (
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "white",
            px: 2,
            py: 0.75,
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <GetAppIcon fontSize="small" />
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
            Install co14ners for quick access
          </Typography>
          <Button
            size="small"
            onClick={handleInstall}
            sx={{
              color: "white",
              bgcolor: "rgba(255,255,255,0.2)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              borderRadius: 2,
              px: 1.5,
              minWidth: 0,
            }}
          >
            Install
          </Button>
          <IconButton size="small" onClick={handleDismiss} sx={{ color: "rgba(255,255,255,0.8)", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* iOS Safari install banner */}
      {showIosBanner && !dismissed && (
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "white",
            px: 2,
            py: 1,
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <IosShareIcon fontSize="small" sx={{ flexShrink: 0 }} />
          <Typography variant="body2" sx={{ flex: 1 }}>
            Tap <IosShareIcon sx={{ fontSize: 14, verticalAlign: "middle", mx: 0.3 }} /> then{" "}
            <strong>Add to Home Screen</strong>
          </Typography>
          <IconButton size="small" onClick={handleDismiss} sx={{ color: "rgba(255,255,255,0.8)", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </AppBar>
  );
}
