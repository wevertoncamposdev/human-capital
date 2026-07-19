"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAccessLogs, type AccessLog, type AccessLogAction } from "@/features/auth/api";
import { ListView } from "@/web-client/views/ListView";

type AccessLogRow = AccessLog & {
  actionLabel: string;
  createdAtLabel: string;
};

const actionLabels: Record<AccessLogAction, string> = {
  LOGIN: "Login",
  REFRESH: "Refresh",
  LOGOUT: "Logout",
};

export function AccessLogsPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<AccessLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const columns = useMemo<ColumnDef<AccessLogRow>[]>(
    () => [
      {
        accessorKey: "actionLabel",
        header: "Acao",
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {row.original.actionLabel}
          </span>
        ),
      },
      {
        accessorKey: "ipAddress",
        header: "IP",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.ipAddress || "-"}
          </span>
        ),
      },
      {
        accessorKey: "userAgent",
        header: "Dispositivo",
        cell: ({ row }) => (
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {row.original.userAgent || "-"}
          </span>
        ),
      },
      {
        accessorKey: "createdAtLabel",
        header: "Data",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdAtLabel}
          </span>
        ),
      },
    ],
    [],
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAccessLogs(token, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: search.trim() || undefined,
      });
      const mapped = response.data.map((log) => ({
        ...log,
        actionLabel: actionLabels[log.action],
        createdAtLabel: new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(log.createdAt)),
      }));
      setRows(mapped);
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
  }, [token, pagination.pageIndex, pagination.pageSize, search]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search]);

  return (
    <section className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1 space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Busca
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar acessos"
          />
        </div>
        <div className="min-w-[180px] space-y-2 text-right">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Resumo
          </div>
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{totalCount}</span>
          </div>
        </div>
      </div>

      <ListView<AccessLogRow>
        data={rows}
        columns={columns}
        className="min-h-[320px]"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <div className="text-xs text-muted-foreground">
          Pagina {Math.min(pagination.pageIndex + 1, Math.max(pageCount, 1))} de{" "}
          {Math.max(pageCount, 1)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPagination((previous) => ({
                ...previous,
                pageIndex: Math.max(previous.pageIndex - 1, 0),
              }))
            }
            disabled={loading || pagination.pageIndex === 0}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPagination((previous) => ({
                ...previous,
                pageIndex:
                  previous.pageIndex + 1 >= pageCount
                    ? previous.pageIndex
                    : previous.pageIndex + 1,
              }))
            }
            disabled={loading || pageCount <= 1 || pagination.pageIndex + 1 >= pageCount}
          >
            Proxima
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando acessos...</p>
      ) : null}
    </section>
  );
}

