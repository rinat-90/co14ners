"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TerrainIcon from "@mui/icons-material/Terrain";
import { trpc } from "@/lib/trpc";
import type { HikeTrackerProps } from "@/components/HikeTrackerInner";

// Dynamic import — Leaflet + GPS require browser APIs
const HikeTrackerInner = dynamic<HikeTrackerProps>(
  () => import("@/components/HikeTrackerInner"),
  { ssr: false, loading: () => <Skeleton variant="rounded" sx={{ height: "100%", width: "100%" }} /> }
);

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function HikePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: mountain, isLoading } = trpc.mountain.getBySlug.useQuery({ slug });

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top overlay */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)",
          pt: { xs: 1.5, md: 2 },
          pb: 3,
          px: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            component={NextLink}
            href={`/mountains/${slug}`}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.15)",
              color: "white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
              backdropFilter: "blur(4px)",
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>

          <Stack direction="row" alignItems="center" spacing={1} flex={1} minWidth={0}>
            <TerrainIcon sx={{ color: "white", fontSize: "1.1rem", flexShrink: 0, opacity: 0.9 }} />
            <Box minWidth={0}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ color: "white", lineHeight: 1.1 }}
                noWrap
              >
                {mountain?.name ?? (isLoading ? "Loading…" : slug)}
              </Typography>
              {mountain && (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  {mountain.altitude.toLocaleString()} ft · Hike Tracker
                </Typography>
              )}
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* Full-screen map */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {isLoading || !mountain ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <TerrainIcon sx={{ fontSize: 48, opacity: 0.4 }} />
            <Typography variant="body2">Loading mountain data…</Typography>
          </Box>
        ) : (
          <HikeTrackerInner
            mountainLat={mountain.latitude}
            mountainLng={mountain.longitude}
            mountainName={mountain.name}
            mountainAltitude={mountain.altitude}
            mountainSlug={toSlug(mountain.name)}
            trails={mountain.trails ?? []}
          />
        )}
      </Box>
    </Box>
  );
}
