import { createTheme } from "@mui/material/styles";

const sharedOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none" as const, fontWeight: 600 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" as const, fullWidth: true },
    },
  },
};

export function createAppTheme(mode: "light" | "dark") {
  return createTheme({
    ...sharedOptions,
    palette: {
      mode,
      primary: { main: "#3b82f6" },   // blue-500 — readable in both modes
      secondary: { main: "#22c55e" },  // green-500
      ...(mode === "light"
        ? {
            background: { default: "#f8fafc", paper: "#ffffff" },
          }
        : {
            background: { default: "#0f172a", paper: "#1e293b" },
          }),
    },
  });
}

// Default export for any code that still imports this directly
export const theme = createAppTheme("light");
