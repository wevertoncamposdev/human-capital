"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { SlidersHorizontal } from "lucide-react";
import {
  getAuditLogs,
  listUsers,
  type AdminAuditLog,
  type AdminUser,
} from "@/features/admin/api";
import { AuditTimeline } from "./audit-timeline";
import { AuditLogDetailsDialog } from "./audit-log-details-dialog";
import { FilterPanel } from "@/components/FilterEngine/FilterPanel";
import { FilterDrawer } from "@/components/FilterEngine/FilterDrawer";
import { useFilterEngine } from "@/lib/filters/use-filter-engine";
import {
  auditTimelineDefaultFilters,
  buildAuditTimelineFilterSchema,
  type AuditTimelineFilterValues,
} from "@/modules/core/features/audit/domain/audit-timeline-filters";

function toIsoRange(value: Pick<AuditTimelineFilterValues, "from" | "to">) {
  const from = value.from ? new Date(`${value.from}T00:00:00.000`) : null;
  const to = value.to ? new Date(`${value.to}T23:59:59.999`) : null;
  return {
    from: from ? from.toISOString() : undefined,
    to: to ? to.toISOString() : undefined,
  };
}

export function AuditTimelinePage() {
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const { toast } = useToast();

  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [logs, setLogs] = React.useState<AdminAuditLog[]>([]);
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<AdminAuditLog | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const canReadAudit = permissions.includes("audit.read");

  const schema = React.useMemo(
    () => buildAuditTimelineFilterSchema(users),
    [users],
  );

  const filters = useFilterEngine<AuditTimelineFilterValues>({
    schema,
    defaults: auditTimelineDefaultFilters,
    syncToUrl: true,
  });

  const loadUsers = React.useCallback(async () => {
    if (!token) return;
    try {
      const response = await listUsers(token, { page: 1, limit: 200 });
      setUsers(response.data);
    } catch {
      setUsers([]);
    }
  }, [token]);

  const loadLogs = React.useCallback(
    async (
      targetPage: number,
      mode: "replace" | "append",
      appliedFilters: AuditTimelineFilterValues,
    ) => {
      if (!token || !canReadAudit) return;
      setLoading(true);
      try {
        const range = toIsoRange(appliedFilters);
        const response = await getAuditLogs(token, {
          page: targetPage,
          limit: 50,
          search: appliedFilters.q.trim() || undefined,
          entity: appliedFilters.entity.trim() || undefined,
          userId:
            appliedFilters.userId !== "all" ? appliedFilters.userId : undefined,
          action:
            appliedFilters.action !== "all" ? appliedFilters.action : undefined,
          from: range.from,
          to: range.to,
        });
        setPages(response.pagination.pages);
        setPage(response.pagination.page);
        setLogs((prev) =>
          mode === "append" ? [...prev, ...response.data] : response.data,
        );
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Erro",
          description:
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Falha ao carregar auditoria.",
        });
      } finally {
        setLoading(false);
      }
    },
    [token, canReadAudit, toast],
  );

  React.useEffect(() => {
    if (authLoading) return;
    if (!token || !isAuthenticated || !canReadAudit) {
      setLoading(false);
      return;
    }
    loadUsers();
  }, [authLoading, token, isAuthenticated, canReadAudit, loadUsers]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!token || !isAuthenticated || !canReadAudit) return;
    loadLogs(1, "replace", filters.applied);
  }, [
    authLoading,
    token,
    isAuthenticated,
    canReadAudit,
    loadLogs,
    filters.applied,
  ]);

  if (!canReadAudit) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Você não tem permissão para acessar esta área.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <FilterDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filtros"
        description="Filtre por data, usuário, entidade ou texto."
      >
        <FilterPanel
          className="rounded-none border-0 bg-transparent p-0"
          schema={schema}
          value={filters.draft}
          onChange={filters.setDraft}
          onApply={() => {
            filters.apply();
            setFiltersOpen(false);
          }}
          onClear={() => {
            filters.clear();
            setFiltersOpen(false);
          }}
          actionsDisabled={loading}
        />
      </FilterDrawer>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Timeline</p>
            <p className="text-xs text-muted-foreground">
              Clique em um item para ver detalhes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen(true)}
              disabled={loading}
            >
              <SlidersHorizontal className="size-4" />
              <span>Filtros</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => loadLogs(1, "replace", filters.applied)}
              disabled={loading}
            >
              Atualizar
            </Button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-220px)] overflow-auto px-4 py-4">
          {logs.length ? (
            <AuditTimeline
              logs={logs}
              onSelect={(log) => {
                setSelected(log);
                setDialogOpen(true);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? "Carregando..." : "Nenhum registro encontrado."}
            </p>
          )}

          {page < pages ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => loadLogs(page + 1, "append", filters.applied)}
                disabled={loading}
              >
                Carregar mais
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <AuditLogDetailsDialog
        log={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
