"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/section-card";
import type { AdminAccessLog } from "@/features/admin/api";
import { ListView } from "@/web-client/views/ListView";

export function AdminUserAccessLogsCard({
  columns,
  rows,
  loading,
  error,
  pageCount,
  totalCount,
  pagination,
  onPaginationChange,
  onSearchChange,
  onRefresh,
}: {
  columns: ColumnDef<AdminAccessLog>[];
  rows: AdminAccessLog[];
  loading: boolean;
  error: string | null;
  pageCount: number;
  totalCount: number;
  pagination: { pageIndex: number; pageSize: number };
  onPaginationChange: (next: { pageIndex: number; pageSize: number }) => void;
  onSearchChange: (next: string) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = React.useState("");

  return (
    <SectionCard
      title="Historico de acessos"
      subtitle="Acompanhamento de login, refresh e logout do usuario."
      actions={
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          Atualizar
        </Button>
      }
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Busca
            </div>
            <Input
              value={search}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearch(nextValue);
                onSearchChange(nextValue);
              }}
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

        <ListView<AdminAccessLog>
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
                onPaginationChange({
                  ...pagination,
                  pageIndex: Math.max(pagination.pageIndex - 1, 0),
                })
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
                onPaginationChange({
                  ...pagination,
                  pageIndex:
                    pagination.pageIndex + 1 >= pageCount
                      ? pagination.pageIndex
                      : pagination.pageIndex + 1,
                })
              }
              disabled={loading || pageCount <= 1 || pagination.pageIndex + 1 >= pageCount}
            >
              Proxima
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando acessos...</p>
      ) : null}
    </SectionCard>
  );
}

