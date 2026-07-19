"use client";

import * as React from "react";
import { apiRequest, refreshAccessToken } from "@/lib/api";
import { getTokenExpirationMs, isTokenExpired } from "@/lib/auth-utils";

type LoginInput = {
  tenantId?: string;
  email: string;
  password: string;
};

export type LoginResponse =
  | { accessToken: string }
  | { mfaRequired: true; challengeId: string; expiresAt: string };

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<LoginResponse>;
  verifyMfa: (input: {
    challengeId: string;
    code: string;
    rememberDevice?: boolean;
  }) => Promise<{ accessToken: string }>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "terceirogestor:token";

const readStoredToken = () => {
  const sessionToken = window.sessionStorage.getItem(STORAGE_KEY);
  if (window.localStorage.getItem(STORAGE_KEY)) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  if (!sessionToken) return null;
  if (isTokenExpired(sessionToken)) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return sessionToken;
};

const clearStoredToken = () => {
  window.sessionStorage.removeItem(STORAGE_KEY);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const init = async () => {
      const stored = readStoredToken();
      if (active) {
        setToken(stored);
      }
      if (!stored) {
        const refreshed = await refreshAccessToken();
        if (active && refreshed) {
          setToken(refreshed);
          window.sessionStorage.setItem(STORAGE_KEY, refreshed);
        }
      }
      if (active) {
        setIsLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  const login = React.useCallback(async (input: LoginInput) => {
    const payload = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
      credentials: "include",
    });

    if ("accessToken" in payload && typeof payload.accessToken === "string") {
      setToken(payload.accessToken);
      window.sessionStorage.setItem(STORAGE_KEY, payload.accessToken);
    }

    return payload;
  }, []);

  const verifyMfa = React.useCallback(
    async (input: {
      challengeId: string;
      code: string;
      rememberDevice?: boolean;
    }) => {
      const payload = await apiRequest<{ accessToken: string }>(
        "/auth/mfa/totp/verify",
        {
          method: "POST",
          body: JSON.stringify(input),
          credentials: "include",
        },
      );
      setToken(payload.accessToken);
      window.sessionStorage.setItem(STORAGE_KEY, payload.accessToken);
      return payload;
    },
    [],
  );

  const logout = React.useCallback(() => {
    if (token) {
      apiRequest(
        "/auth/logout",
        { method: "POST", credentials: "include" },
        token,
      ).catch(() => undefined);
    }
    setToken(null);
    clearStoredToken();
  }, [token]);

  React.useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  React.useEffect(() => {
    const handleToken = (event: Event) => {
      const customEvent = event as CustomEvent<{ token?: string }>;
      const nextToken = customEvent.detail?.token;
      if (typeof nextToken !== "string" || !nextToken) return;
      setToken(nextToken);
      window.sessionStorage.setItem(STORAGE_KEY, nextToken);
    };
    window.addEventListener("auth:token", handleToken);
    return () => {
      window.removeEventListener("auth:token", handleToken);
    };
  }, []);

  React.useEffect(() => {
    if (!token) return undefined;
    const expiresAt = getTokenExpirationMs(token);
    if (!expiresAt) return undefined;
    const timeoutMs = Math.max(expiresAt - Date.now(), 0);
    const handle = window.setTimeout(() => logout(), timeoutMs);
    return () => window.clearTimeout(handle);
  }, [token, logout]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      verifyMfa,
      logout,
    }),
    [token, isLoading, login, verifyMfa, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
