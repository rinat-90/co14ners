"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running as standalone PWA)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user already dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  };

  if (!prompt || dismissed) return null;

  return (
    <Paper
      elevation={4}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2.5,
        py: 1.5,
        borderRadius: 3,
        bgcolor: "primary.main",
        color: "white",
        mx: { xs: 2, md: "auto" },
        maxWidth: 520,
        mt: 3,
      }}
    >
      <GetAppIcon />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={700}>
          Install co14ners
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          Add to your home screen for quick access
        </Typography>
      </Box>
      <Button
        size="small"
        onClick={handleInstall}
        sx={{ color: "white", bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" }, borderRadius: 2, whiteSpace: "nowrap" }}
      >
        Install
      </Button>
      <IconButton size="small" onClick={handleDismiss} sx={{ color: "rgba(255,255,255,0.7)" }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}
