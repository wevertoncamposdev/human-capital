"use client";

import * as React from "react";
import { getUserAccessLogs, type AdminAccessLog } from "@/features/admin/api";
import { buildAccessLogColumns } from "@/modules/core/features/admin-users/domain/access-log-columns";

export function useAdminUserAccessLogs({
  token,
  userId,
  enabled,
}: {
  token: string | null;
  userId: string;
  enabled: boolean;
}) {
  const [rows, setRows] = React.useState<AdminAccessLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = React.useState("");

  const columns = React.useMemo(() => buildAccessLogColumns(), []);

  const reload = React.useCallback(async () => {
    if (!token || !userId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getUserAccessLogs(token, userId, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search.trim() || undefined,
      });
      setRows(response.data);
      setTotalCount(response.pagination.total);
      setPageCount(response.pagination.pages);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar acessos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, userId, enabled, pagination.pageIndex, pagination.pageSize, search]);

  React.useEffect(() => {
    if (!token || !userId || !enabled) {
      setLoading(false);
      return;
    }
    reload();
  }, [token, userId, enabled, reload]);

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search]);

  return {
    columns,
    rows,
    loading,
    error,
    pageCount,
    totalCount,
    pagination,
    setPagination,
    search,
    setSearch,
    reload,
  };
}

