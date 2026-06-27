"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { trpc } from "./trpc";
import { theme } from "./theme";
import { AuthProvider, useAuth } from "./auth-context";

/** Runs inside tRPC + Auth providers — fetches fresh user data on load */
function UserHydrator() {
  const { accessToken, setUser } = useAuth();
  const { data } = trpc.user.me.useQuery(undefined, {
    enabled: !!accessToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

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
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <TrpcProvider>{children}</TrpcProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
