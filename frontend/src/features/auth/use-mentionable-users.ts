"use client";

import * as React from "react";
import { listMentionableUsers, type MentionableUser } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";

export function useMentionableUsers(permission?: string | null) {
  const { token } = useAuth();
  const [users, setUsers] = React.useState<MentionableUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token || !permission?.trim()) {
      setUsers([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void listMentionableUsers(token, { permission: permission.trim() })
      .then((response) => {
        if (!cancelled) {
          setUsers(response);
        }
      })
      .catch((nextError) => {
        if (cancelled) return;
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao carregar usuarios para mencoes.";
        setUsers([]);
        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [permission, token]);

  return { users, isLoading, error };
}
