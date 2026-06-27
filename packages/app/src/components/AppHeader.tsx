"use client";

import NextLink from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useAuth } from "@/lib/auth-context";

export default function AppHeader() {
  const { accessToken, logout } = useAuth();

  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
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
    </AppBar>
  );
}
