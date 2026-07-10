"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import CssBaseline from "@mui/material/CssBaseline";
import { trpc } from "./trpc";
import { AppThemeProvider } from "./theme-context";
import Box from "@mui/material/Box";
import BottomNav from "@/components/BottomNav";
import { AuthProvider, useAuth } from "./auth-context";

/** Runs inside tRPC + Auth providers — fetches fresh user data and handles token refresh */
function UserHydrator() {
  const { accessToken, setUser, setTokens, logout } = useAuth();
  const utils = trpc.useUtils();

  const refreshMutation = trpc.auth.refresh.useMutation({
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      // Re-fetch user after token is updated in localStorage
      utils.user.me.invalidate();
    },
    onError: () => logout(),
  });

  const { data, error } = trpc.user.me.useQuery(undefined, {
    enabled: !!accessToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  useEffect(() => {
    if (!error) return;
    const httpStatus = (error as { data?: { httpStatus?: number } }).data?.httpStatus;
    if (httpStatus === 401) {
      const rt = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
      if (rt) refreshMutation.mutate({ refreshToken: rt });
      else logout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return null;
}

function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/trpc`,
          headers() {
            const token =
              typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <UserHydrator />
        <Box sx={{ pb: { xs: 8, md: 0 } }}>{children}</Box>
        <BottomNav />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <TrpcProvider>{children}</TrpcProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}
