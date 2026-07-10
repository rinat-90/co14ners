"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "./theme";

type Mode = "light" | "dark";

interface ThemeModeCtx {
  mode: Mode;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeCtx>({ mode: "light", toggle: () => {} });

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

const STORAGE_KEY = "co14ners-theme";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("light");

  // Read from localStorage (or system preference) on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Mode | null;
    if (stored === "light" || stored === "dark") {
      setMode(stored);
    } else {
      // Respect OS preference on first visit
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setMode(prefersDark ? "dark" : "light");
    }
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const appTheme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={appTheme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
