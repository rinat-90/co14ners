"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

const TrailMapInner = dynamic(() => import("./TrailMapInner"), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" sx={{ height: "100%", width: "100%" }} />,
});

interface Trail {
  id: string;
  name: string;
  difficulty: string;
  // Prisma Json fields come back as a broad union; we narrow it internally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry?: any;
}

interface TrailMapProps {
  latitude: number;
  longitude: number;
  name: string;
  trails: Trail[];
  height?: number | string;
}

export default function TrailMap({ latitude, longitude, name, trails, height = 380 }: TrailMapProps) {
  return (
    <Box sx={{ height, width: "100%", borderRadius: 3, overflow: "hidden" }}>
      <TrailMapInner latitude={latitude} longitude={longitude} name={name} trails={trails} />
    </Box>
  );
}
