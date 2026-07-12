"use client";

import { useState } from "react";
import { IconButton, Stack, Typography, Tooltip } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

type Props = {
  targetId: string;
  targetType: "COMPLETION" | "TRIP_REPORT";
  initialCount: number;
  initialKudoed: boolean;
};

export default function KudoButton({ targetId, targetType, initialCount, initialKudoed }: Props) {
  const router = useRouter();
  const [kudoed, setKudoed] = useState(initialKudoed);
  const [count, setCount] = useState(initialCount);

  const toggle = trpc.kudo.toggle.useMutation({
    onMutate: () => {
      // Optimistic update
      setKudoed((prev) => !prev);
      setCount((prev) => (kudoed ? prev - 1 : prev + 1));
    },
    onError: () => {
      // Revert on error
      setKudoed((prev) => !prev);
      setCount((prev) => (kudoed ? prev + 1 : prev - 1));
    },
    onSuccess: (data) => {
      setKudoed(data.kudoed);
      setCount(data.count);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check auth — if no token in localStorage, redirect to login
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/auth/login");
        return;
      }
    }

    toggle.mutate({ targetId, targetType });
  };

  return (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      <Tooltip title={kudoed ? "Remove kudo" : "Give kudos"}>
        <IconButton
          size="small"
          onClick={handleClick}
          disabled={toggle.isPending}
          sx={{ color: kudoed ? "error.main" : "action.disabled", p: 0.5 }}
        >
          {kudoed ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      {count > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
          {count}
        </Typography>
      )}
    </Stack>
  );
}
