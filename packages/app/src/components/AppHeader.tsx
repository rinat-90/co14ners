"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import GetAppIcon from "@mui/icons-material/GetApp";
import IosShareIcon from "@mui/icons-material/IosShare";
import LogoutIcon from "@mui/icons-material/Logout";
import MapIcon from "@mui/icons-material/Map";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useAuth } from "@/lib/auth-context";

function displayName(user: { name?: string | null; email: string } | null) {
  if (!user) return "Account";
  return user.name ?? user.email.split("@")[0];
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
              <Button
                startIcon={<AccountCircleIcon />}
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
