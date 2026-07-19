"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/auth-context";
import {
  getCurrentUser,
  getTenantProfile,
  type CurrentUserProfile,
  type TenantProfile,
} from "@/features/auth/api";
import { isDetailAutoSaveSuspended } from "@/web-client/detail/detail-media-autosave-guard";

type CurrentUserContextValue = {
  user: CurrentUserProfile | null;
  tenant: TenantProfile | null;
  permissions: string[];
  roles: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const CurrentUserContext = React.createContext<CurrentUserContextValue | null>(
  null,
);

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuth();
  const [user, setUser] = React.useState<CurrentUserProfile | null>(null);
  const [tenant, setTenant] = React.useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const refreshInFlightRef = React.useRef(false);
  const lastRefreshAtRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!token) {
      setUser(null);
      setTenant(null);
      return;
    }
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setIsLoading(true);
    try {
      const [userProfile, tenantProfile] = await Promise.all([
        getCurrentUser(token),
        getTenantProfile(token),
      ]);
      setUser(userProfile);
      setTenant(tenantProfile);
    } catch {
      setUser(null);
      setTenant(null);
    } finally {
      setIsLoading(false);
      refreshInFlightRef.current = false;
    }
  }, [token]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshIfStale = React.useCallback(() => {
    if (!token) return;
    if (refreshInFlightRef.current) return;
    if (isDetailAutoSaveSuspended()) return;
    const now = Date.now();
    if (now - lastRefreshAtRef.current < 5_000) return;
    lastRefreshAtRef.current = now;
    refresh();
  }, [refresh, token]);

  React.useEffect(() => {
    if (!token) return;

    const handleFocus = () => refreshIfStale();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshIfStale, token]);

  const permissions = React.useMemo(
    () => user?.permissions ?? [],
    [user?.permissions],
  );
  const roles = React.useMemo(
    () => user?.roles.map((role) => role.name) ?? [],
    [user?.roles],
  );

  const value = React.useMemo<CurrentUserContextValue>(
    () => ({
      user,
      tenant,
      permissions,
      roles,
      isLoading,
      refresh,
    }),
    [user, tenant, permissions, roles, isLoading, refresh],
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = React.useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return ctx;
}
