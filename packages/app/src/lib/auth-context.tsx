"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore both token and cached user on mount for instant hydration
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (token) setAccessToken(token);
    if (storedUser) {
      try { setUserState(JSON.parse(storedUser)); } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
  }, []);

  const setTokens = useCallback((at: string, rt: string) => {
    localStorage.setItem("accessToken", at);
    localStorage.setItem("refreshToken", rt);
    setAccessToken(at);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, setTokens, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
