"use client";

import * as React from "react";
import { getUserById, type AdminUser } from "@/features/admin/api";

export function useAdminUser({
  token,
  userId,
  enabled,
}: {
  token: string | null;
  userId: string;
  enabled: boolean;
}) {
  const [user, setUser] = React.useState<AdminUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!token || !userId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getUserById(token, userId);
      setUser(response);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar usuário.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, userId, enabled]);

  React.useEffect(() => {
    if (!token || !userId || !enabled) {
      setLoading(false);
      return;
    }
    reload();
  }, [token, userId, enabled, reload]);

  return { user, loading, error, reload };
}

