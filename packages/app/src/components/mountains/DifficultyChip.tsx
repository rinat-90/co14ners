"use client";

import Chip from "@mui/material/Chip";

type Difficulty = "CLASS_1" | "CLASS_2" | "CLASS_3" | "CLASS_4" | "CLASS_5";

const LABELS: Record<Difficulty, string> = {
  CLASS_1: "Class 1",
  CLASS_2: "Class 2",
  CLASS_3: "Class 3",
  CLASS_4: "Class 4",
  CLASS_5: "Class 5",
};

const COLORS: Record<Difficulty, "success" | "info" | "warning" | "error" | "default"> = {
  CLASS_1: "success",
  CLASS_2: "info",
  CLASS_3: "warning",
  CLASS_4: "error",
  CLASS_5: "default",
};

export default function DifficultyChip({ difficulty, size = "small" }: { difficulty: Difficulty; size?: "small" | "medium" }) {
  return (
    <Chip
      label={LABELS[difficulty]}
      color={COLORS[difficulty]}
      size={size}
      sx={{ fontWeight: 600, fontSize: size === "medium" ? 14 : 12 }}
    />
  );
}
