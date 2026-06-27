"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useAuth } from "@/lib/auth-context";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function AppHeader() {
  const { accessToken, logout } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

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
  };

  const showBanner = !!installPrompt && !dismissed;

  return (
    <AppBar position="sticky" top={0} color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
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
          <Button component={NextLink} href="/mountains" color="inherit" sx={{ fontWeight: 600 }}>
            14ers
          </Button>
          {accessToken ? (
            <>
              <Button
                component={NextLink}
                href="/profile"
                color="inherit"
                startIcon={<AccountCircleIcon />}
                sx={{ fontWeight: 600 }}
              >
                Profile
              </Button>
              <Button variant="outlined" size="small" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <Button variant="contained" size="small" component={NextLink} href="/login">
              Sign in
            </Button>
          )}
        </Box>
      </Toolbar>

      {/* Install banner — mobile only */}
      {showBanner && (
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
            Install co14ners for quick access from your home screen
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
    </AppBar>
  );
}
