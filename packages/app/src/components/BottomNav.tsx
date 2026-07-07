"use client";

import { usePathname, useRouter } from "next/navigation";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import HomeIcon from "@mui/icons-material/Home";
import MapIcon from "@mui/icons-material/Map";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { label: "Home",    icon: <HomeIcon />,          href: "/" },
  { label: "14ers",   icon: <TerrainIcon />,        href: "/mountains" },
  { label: "Map",     icon: <MapIcon />,            href: "/map" },
  { label: "Feed",    icon: <DynamicFeedIcon />,    href: "/feed" },
  { label: "Profile", icon: <AccountCircleIcon />,  href: "/profile" },
];

const HIDDEN_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/settings"];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken } = useAuth();

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const current = NAV_ITEMS.findIndex((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        display: { xs: "block", md: "none" },
        borderTop: "1px solid",
        borderColor: "divider",
      }}
      elevation={0}
    >
      <BottomNavigation
        value={current}
        onChange={(_, idx) => {
          const item = NAV_ITEMS[idx];
          if (item.href === "/profile" && !accessToken) {
            router.push("/login?redirect=/profile");
          } else {
            router.push(item.href);
          }
        }}
        sx={{ height: 64 }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.href}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
