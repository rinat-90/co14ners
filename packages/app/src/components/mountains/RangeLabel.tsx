"use client";

import Typography from "@mui/material/Typography";
import type { SxProps } from "@mui/material/styles";

type Range =
  | "SAWATCH"
  | "ELK"
  | "SAN_JUAN"
  | "TENMILE_MOSQUITO"
  | "FRONT"
  | "SANGRE_DE_CRISTO"
  | "OTHER";

const LABELS: Record<Range, string> = {
  SAWATCH: "Sawatch Range",
  ELK: "Elk Mountains",
  SAN_JUAN: "San Juan Mountains",
  TENMILE_MOSQUITO: "Tenmile / Mosquito Range",
  FRONT: "Front Range",
  SANGRE_DE_CRISTO: "Sangre de Cristo Range",
  OTHER: "Other",
};

export default function RangeLabel({ range, sx }: { range: Range; sx?: SxProps }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={sx}>
      {LABELS[range]}
    </Typography>
  );
}
