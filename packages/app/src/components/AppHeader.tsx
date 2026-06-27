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
import IosShareIcon from "@mui/icons-material/IosShare";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useAuth } from "@/lib/auth-context";

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
  const { accessToken, logout } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as standalone — don't show
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
