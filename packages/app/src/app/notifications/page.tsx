"use client";

import { useEffect } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import StarIcon from "@mui/icons-material/Star";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

type NotifType = "FOLLOW" | "REVIEW_ON_SUMMIT" | "COMMENT_ON_REPORT";

const TYPE_META: Record<NotifType, { icon: React.ReactNode; color: string; label: string }> = {
  FOLLOW:            { icon: <PersonAddIcon fontSize="small" />,         color: "#3b82f6", label: "Follow" },
  REVIEW_ON_SUMMIT:  { icon: <StarIcon fontSize="small" />,              color: "#f59e0b", label: "Review" },
  COMMENT_ON_REPORT: { icon: <ChatBubbleOutlineIcon fontSize="small" />, color: "#8b5cf6", label: "Comment" },
};

function typeLabel(type: NotifType, actorName: string, mountainName?: string | null): string {
  switch (type) {
    case "FOLLOW":            return `${actorName} started following you`;
    case "REVIEW_ON_SUMMIT":  return `${actorName} reviewed ${mountainName ?? "a peak"} you've summited`;
    case "COMMENT_ON_REPORT": return `${actorName} commented on your trip report${mountainName ? ` for ${mountainName}` : ""}`;
  }
}

function notifHref(type: NotifType, actorId: string, mountainName?: string | null): string {
  if (type === "FOLLOW") return `/users/${actorId}`;
  if (mountainName) {
    const slug = mountainName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `/mountains/${slug}`;
  }
  return "/";
}

function timeAgo(d: string | Date) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string | null | undefined, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const utils = trpc.useUtils();

  const { data: notifications, isLoading } = trpc.notification.list.useQuery(
    { limit: 50 },
    { enabled: !!accessToken }
  );

  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  // Auto-mark unread as read when page opens
  useEffect(() => {
    if (!accessToken) return;
    const unread = notifications?.filter((n) => !n.read).map((n) => n.id) ?? [];
    if (unread.length > 0) markRead.mutate({ ids: unread });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, accessToken]);

  if (!accessToken && typeof window !== "undefined") {
    router.push("/login?redirect=/notifications");
    return null;
  }

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: { xs: 10, md: 4 } }}>
      <AppHeader />
      <Box sx={{ maxWidth: 680, mx: "auto", px: { xs: 2, md: 4 }, pt: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
          <NotificationsIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, flex: 1 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </Stack>

        {isLoading ? (
          <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ display: "flex", gap: 2, px: 2, py: 1.5, borderBottom: i < 4 ? "1px solid" : "none", borderColor: "divider" }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="70%" height={18} />
                  <Skeleton width="30%" height={14} />
                </Box>
              </Box>
            ))}
          </Paper>
        ) : !notifications || notifications.length === 0 ? (
          <Paper sx={{ borderRadius: 3, py: 8, textAlign: "center" }}>
            <NotificationsNoneIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={500}>No notifications yet</Typography>
            <Typography variant="body2" color="text.disabled" mt={0.5}>
              You&apos;ll see follows, comments, and reviews here
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
            <List disablePadding>
              {notifications.map((n, i) => {
                const meta = TYPE_META[n.type as NotifType] ?? TYPE_META.FOLLOW;
                const actorName = n.actor.name ?? n.actor.email.split("@")[0];
                const href = notifHref(n.type as NotifType, n.actor.id, n.mountain?.name);
                const label = typeLabel(n.type as NotifType, actorName, n.mountain?.name);

                return (
                  <Box key={n.id}>
                    <ListItem
                      component={NextLink}
                      href={href}
                      alignItems="flex-start"
                      sx={{
                        textDecoration: "none",
                        color: "inherit",
                        bgcolor: n.read ? "transparent" : "action.hover",
                        px: 2,
                        py: 1.5,
                        transition: "background 0.15s",
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 52 }}>
                        <Box sx={{ position: "relative", display: "inline-block" }}>
                          <Avatar
                            src={n.actor.avatar ?? undefined}
                            sx={{ width: 40, height: 40, fontSize: 14, fontWeight: 700 }}
                          >
                            {!n.actor.avatar && initials(n.actor.name, n.actor.email)}
                          </Avatar>
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: -2,
                              right: -4,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              bgcolor: meta.color,
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid",
                              borderColor: "background.paper",
                              "& svg": { fontSize: "0.7rem" },
                            }}
                          >
                            {meta.icon}
                          </Box>
                        </Box>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                            <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                              {label}
                            </Typography>
                            {!n.read && (
                              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />
                            )}
                          </Stack>
                        }
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.25}>
                            <Chip
                              label={meta.label}
                              size="small"
                              sx={{ height: 18, fontSize: "0.65rem", fontWeight: 600, bgcolor: meta.color + "22", color: meta.color }}
                            />
                            <Typography variant="caption" color="text.disabled">{timeAgo(n.createdAt)}</Typography>
                          </Stack>
                        }
                      />
                    </ListItem>
                    {i < notifications.length - 1 && <Divider component="li" />}
                  </Box>
                );
              })}
            </List>
          </Paper>
        )}
      </Box>
      <BottomNav />
    </Box>
  );
}
