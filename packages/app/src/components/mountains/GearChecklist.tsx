"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import BackpackIcon from "@mui/icons-material/Backpack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

// ── Static gear definitions ───────────────────────────────────────────────────

type GearItem = { key: string; label: string; minClass?: 1 | 2 | 3 | 4 | 5 };

const GEAR: GearItem[] = [
  // Essentials — always shown
  { key: "water", label: "Water (2–4 L)" },
  { key: "food", label: "Food & snacks" },
  { key: "map", label: "Map / trail info" },
  { key: "headlamp", label: "Headlamp + extra batteries" },
  { key: "sunscreen", label: "Sunscreen & sunglasses" },
  { key: "firstaid", label: "First aid kit" },
  { key: "rain", label: "Rain jacket / wind layer" },
  { key: "warm", label: "Warm layer (fleece/puffy)" },
  { key: "boots", label: "Sturdy hiking boots" },
  { key: "gaiters", label: "Gaiters" },
  { key: "trekking", label: "Trekking poles" },
  { key: "phone", label: "Fully charged phone" },
  { key: "emergency", label: "Emergency whistle" },
  // Class 3+
  { key: "gloves", label: "Gloves", minClass: 3 },
  { key: "helmet", label: "Helmet", minClass: 3 },
  // Class 4+
  { key: "harness", label: "Harness", minClass: 4 },
  { key: "rope", label: "Rope (30–60m)", minClass: 4 },
  { key: "belay", label: "Belay / rappel device", minClass: 4 },
  { key: "slings", label: "Slings & carabiners", minClass: 4 },
  // Class 5
  { key: "cams", label: "Cams / nuts (trad rack)", minClass: 5 },
];

const CLASS_ORDER: Record<string, number> = {
  CLASS_1: 1, CLASS_2: 2, CLASS_3: 3, CLASS_4: 4, CLASS_5: 5,
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  mountainId: string;
  difficulty: string;
}

export default function GearChecklist({ mountainId, difficulty }: Props) {
  const { accessToken } = useAuth();
  const classNum = CLASS_ORDER[difficulty] ?? 1;
  const items = GEAR.filter((g) => !g.minClass || g.minClass <= classNum);

  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const { data } = trpc.gear.getChecklist.useQuery(
    { mountainId },
    { enabled: !!accessToken && open, staleTime: Infinity }
  );

  const saveMutation = trpc.gear.saveChecklist.useMutation();

  useEffect(() => {
    if (data) setChecked(new Set(data.checked));
  }, [data]);

  const toggle = useCallback(
    (key: string) => {
      if (!accessToken) return;
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(key)) { next.delete(key); } else { next.add(key); }
        return next;
      });
      setDirty(true);
    },
    [accessToken]
  );

  // Auto-save 1s after last change
  useEffect(() => {
    if (!dirty || !accessToken) return;
    const t = setTimeout(() => {
      saveMutation.mutate({ mountainId, checked: Array.from(checked) });
      setDirty(false);
    }, 1000);
    return () => clearTimeout(t);
  }, [checked, dirty, mountainId, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkedCount = items.filter((g) => checked.has(g.key)).length;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.5,
          cursor: "pointer",
          userSelect: "none",
          "&:hover": { bgcolor: "action.hover" },
        }}
        onClick={() => setOpen((p) => !p)}
      >
        <BackpackIcon sx={{ mr: 1.5, color: "primary.main" }} />
        <Typography fontWeight={700} sx={{ flex: 1 }}>
          Gear Checklist
        </Typography>
        {open && checkedCount > 0 && (
          <Chip
            label={`${checkedCount}/${items.length}`}
            size="small"
            color={checkedCount === items.length ? "success" : "default"}
            sx={{ mr: 1 }}
          />
        )}
        {open && checkedCount > 0 && (
          <Tooltip title="Reset checklist">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setChecked(new Set());
                setDirty(true);
              }}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>

      <Collapse in={open}>
        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          {!accessToken && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Sign in to save your checklist.
            </Typography>
          )}
          {items.map((item) => (
            <FormControlLabel
              key={item.key}
              label={
                <Typography
                  variant="body2"
                  sx={{ textDecoration: checked.has(item.key) ? "line-through" : "none", color: checked.has(item.key) ? "text.disabled" : "text.primary" }}
                >
                  {item.label}
                  {item.minClass && item.minClass >= 3 && (
                    <Chip label={`Class ${item.minClass}+`} size="small" sx={{ ml: 1, fontSize: "0.65rem", height: 18 }} />
                  )}
                </Typography>
              }
              control={
                <Checkbox
                  size="small"
                  checked={checked.has(item.key)}
                  onChange={() => toggle(item.key)}
                  disabled={!accessToken}
                />
              }
              sx={{ display: "flex", m: 0, py: 0.25 }}
            />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}
