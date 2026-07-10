"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CloseIcon from "@mui/icons-material/Close";

export interface GalleryPhoto {
  url: string;
  caption?: string;
  author?: string;
}

interface Props {
  photos: GalleryPhoto[];
  open: boolean;
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

export default function PhotoGallery({ photos, open, index, onClose, onIndexChange }: Props) {
  const total = photos.length;
  const prev = () => onIndexChange((index - 1 + total) % total);
  const next = () => onIndexChange((index + 1) % total);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const photo = photos[index];
  if (!photo) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            bgcolor: "rgba(0,0,0,0.95)", boxShadow: "none", m: 0, borderRadius: 0,
            width: "100vw", maxWidth: "100vw", height: "100dvh", maxHeight: "100dvh",
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100%", position: "relative", px: { xs: 7, md: 12 }, py: 4,
        }}
      >
        {/* Close */}
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 12, right: 12, color: "white", bgcolor: "rgba(255,255,255,0.12)", "&:hover": { bgcolor: "rgba(255,255,255,0.22)" } }}>
          <CloseIcon />
        </IconButton>

        {/* Counter */}
        {total > 1 && (
          <Typography variant="caption" sx={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.45)" }}>
            {index + 1} / {total}
          </Typography>
        )}

        {/* Prev */}
        {total > 1 && (
          <IconButton onClick={prev} sx={{ position: "absolute", left: { xs: 4, md: 16 }, top: "50%", transform: "translateY(-50%)", color: "white", bgcolor: "rgba(255,255,255,0.12)", "&:hover": { bgcolor: "rgba(255,255,255,0.22)" } }}>
            <ArrowBackIosNewIcon />
          </IconButton>
        )}

        {/* Image */}
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.url}
            src={photo.url}
            alt={photo.caption ?? "Trip photo"}
            style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", display: "block", borderRadius: 4 }}
          />
        </Box>

        {/* Caption */}
        {(photo.caption || photo.author) && (
          <Box sx={{ textAlign: "center", mt: 1.5, color: "white" }}>
            {photo.caption && <Typography variant="body2" fontWeight={600}>{photo.caption}</Typography>}
            {photo.author && <Typography variant="caption" sx={{ opacity: 0.5 }}>by {photo.author}</Typography>}
          </Box>
        )}

        {/* Next */}
        {total > 1 && (
          <IconButton onClick={next} sx={{ position: "absolute", right: { xs: 4, md: 16 }, top: "50%", transform: "translateY(-50%)", color: "white", bgcolor: "rgba(255,255,255,0.12)", "&:hover": { bgcolor: "rgba(255,255,255,0.22)" } }}>
            <ArrowForwardIosIcon />
          </IconButton>
        )}

        {/* Thumbnail strip */}
        {total > 1 && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, overflow: "auto", maxWidth: "100%", pb: 0.5 }}>
            {photos.map((p, i) => (
              <Box
                key={i}
                onClick={() => onIndexChange(i)}
                sx={{
                  width: 52, height: 52, flexShrink: 0, borderRadius: 1, overflow: "hidden", cursor: "pointer",
                  border: i === index ? "2px solid white" : "2px solid transparent",
                  opacity: i === index ? 1 : 0.45,
                  transition: "opacity 0.15s, border-color 0.15s",
                  "&:hover": { opacity: 0.8 },
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Dialog>
  );
}
