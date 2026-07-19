"use client";

import * as React from "react";
import { getAuditLogs, type AdminAuditLog } from "@/features/admin/api";

export function useAdminUserAuditLogs({
  token,
  userId,
  enabled,
}: {
  token: string | null;
  userId: string;
  enabled: boolean;
}) {
  const [logs, setLogs] = React.useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);

  const reload = React.useCallback(
    async (mode: "replace" | "append" = "replace", targetPage = 1) => {
      if (!token || !userId || !enabled) return;
      setLoading(true);
      setError(null);
      try {
        const response = await getAuditLogs(token, {
          page: targetPage,
          limit: 20,
          userId,
        });
        setPages(response.pagination.pages);
        setPage(response.pagination.page);
        setLogs((prev) =>
          mode === "append" ? [...prev, ...response.data] : response.data,
        );
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao carregar auditoria.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [token, userId, enabled],
  );

  const loadMore = React.useCallback(() => {
    if (page >= pages) return;
    return reload("append", page + 1);
  }, [page, pages, reload]);

  React.useEffect(() => {
    if (!token || !userId || !enabled) {
      setLoading(false);
      return;
    }
    reload("replace", 1);
  }, [token, userId, enabled, reload]);

  return { logs, loading, error, page, pages, reload, loadMore };
}

