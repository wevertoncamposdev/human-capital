"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import type { ApiProjectGroup } from "@/modules/projects/api";
import {
  PROJECT_GROUPS_ROUTES,
  projectGroupsListModuleDefinition,
  type ProjectGroupsListQueryState,
} from "@/modules/projects/config/project-groups-module-contract";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { createRestDataProvider } from "@/web-client/data-provider";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import { matchesDomainRecord } from "@/web-client/domain/evaluate";
import { parseDomain, serializeDomain } from "@/web-client/domain/serialize";
import { EntityModuleShell } from "@/web-client/record/RecordListHost";
import { hasModulePermission } from "@/web-client/registry/module-utils";
import { useModuleQueryState } from "@/web-client/screen/useModuleQueryState";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { buildGraphViewModel, GraphView } from "@/web-client/views/GraphView";
import { KanbanView } from "@/web-client/views/KanbanView";
import { ListView } from "@/web-client/views/ListView";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseState(params: URLSearchParams): ProjectGroupsListQueryState {
  return {
    ...projectGroupsListModuleDefinition.defaultQueryState,
    view: (params.get("view") as ProjectGroupsListQueryState["view"]) ?? "table",
    searchText: params.get("q") ?? "",
    domain: parseDomain(params.get("d")) ?? null,
    groupBy: (params.get("g") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    pageIndex: parsePositiveInt(params.get("page"), 1) - 1,
    pageSize: Math.min(Math.max(parsePositiveInt(params.get("limit"), 20), 1), 100),
  };
}

function serializeState(state: ProjectGroupsListQueryState) {
  return {
    view: state.view === "table" ? undefined : state.view,
    q: state.searchText.trim() || undefined,
    d: state.domain ? serializeDomain(state.domain) : undefined,
    g: state.groupBy.length ? state.groupBy.join(",") : undefined,
    page: state.pageIndex > 0 ? String(state.pageIndex + 1) : undefined,
    limit: state.pageSize === 20 ? undefined : String(state.pageSize),
  };
}

function columns(): ColumnDef<ApiProjectGroup>[] {
  return [
    {
      accessorKey: "name",
      header: "Grupo de Participantes",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-medium text-foreground">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.description?.trim() || "Sem descricao"}
          </div>
        </div>
      ),
    },
    {
      id: "project",
      header: "Projeto",
      accessorFn: (row) => row.project?.name ?? null,
      cell: ({ row }) => row.original.project?.name ?? "-",
    },
    {
      id: "actionsCount",
      header: "Acoes",
      accessorFn: (row) => row._count?.actions ?? 0,
      meta: { dataType: "number" },
      cell: ({ row }) => row.original._count?.actions ?? 0,
    },
    {
      id: "memberships",
      header: "Participantes",
      accessorFn: (row) => row._count?.memberships ?? 0,
      meta: { dataType: "number" },
      cell: ({ row }) => row.original._count?.memberships ?? 0,
    },
    {
      accessorKey: "createdAt",
      header: "Cadastro",
      cell: ({ row }) => row.original.createdAt.slice(0, 10),
    },
  ];
}

export function ProjectGroupsListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname) ?? "";
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const columnDefs = React.useMemo(() => columns(), []);
  const canRead = hasModulePermission(projectGroupsListModuleDefinition, "canRead", permissions);
  const canCreate = permissions.includes("project-structure.create");

  const [rows, setRows] = React.useState<ApiProjectGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const [state, setState] = useModuleQueryState<ProjectGroupsListQueryState>({
    moduleDefinition: projectGroupsListModuleDefinition,
    trackedKeys: ["view", "q", "d", "g", "page", "limit"],
    parse: parseState,
    serialize: serializeState,
  });

  React.useEffect(() => {
    if (authLoading || userLoading) return;
    if (!token || !canRead) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    dataProvider
      .search<ApiProjectGroup>("project-groups.list", {
        searchText: state.searchText,
        all: true,
      })
      .then((result) => setRows(result.data))
      .catch((nextError) => {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao carregar grupos.";
        setRows([]);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [authLoading, canRead, dataProvider, refreshKey, state.searchText, token, userLoading]);

  const filteredRows = React.useMemo(
    () =>
      rows.filter((row) =>
        matchesDomainRecord(
          row,
          state.domain,
          (current, field) => current[field as keyof typeof current],
        ),
      ),
    [rows, state.domain],
  );

  const pagedRows = React.useMemo(() => {
    const start = state.pageIndex * state.pageSize;
    return filteredRows.slice(start, start + state.pageSize);
  }, [filteredRows, state.pageIndex, state.pageSize]);
  const pageCount = Math.max(Math.ceil(Math.max(filteredRows.length, 1) / state.pageSize), 1);

  const openDetail = React.useCallback(
    (group: ApiProjectGroup) => {
      router.push(
        withTenantPath(
          `${PROJECT_GROUPS_ROUTES.detail}/${encodeURIComponent(group.id)}`,
          tenantSlug,
        ),
      );
    },
    [router, tenantSlug],
  );

  const removeDomainCondition = React.useCallback(
    (index: number) => {
      setState((previous) => ({
        ...previous,
        domain: removeConditionAtIndex(previous.domain, "and", index),
        pageIndex: 0,
      }));
    },
    [setState],
  );

  const queryFacets = React.useMemo(
    () =>
      buildQueryFacets({
        domain: state.domain,
        groupBy: state.groupBy,
        searchView: projectGroupsListModuleDefinition.searchConfig,
        onClearGroupBy: () => setState((previous) => ({ ...previous, groupBy: [] })),
        onClearDomain: () => setState((previous) => ({ ...previous, domain: null, pageIndex: 0 })),
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [removeDomainCondition, setState, state.domain, state.groupBy],
  );

  const favoriteSnapshot = React.useMemo(
    () => ({
      view: state.view,
      searchText: state.searchText,
      domain: state.domain,
      groupBy: state.groupBy,
      pageSize: state.pageSize,
    }),
    [state.domain, state.groupBy, state.pageSize, state.searchText, state.view],
  );

  const graphBuilder = React.useMemo(() => {
    const graphView = projectGroupsListModuleDefinition.views.find(
      (view) => view.id === "graph" && view.viewType === "graph",
    );
    return graphView?.viewType === "graph" ? graphView.params?.builder : undefined;
  }, []);

  const graphModel = React.useMemo(
    () =>
      graphBuilder
        ? buildGraphViewModel(
            filteredRows as Array<Record<string, unknown>>,
            state.graph,
            graphBuilder,
          )
        : null,
    [filteredRows, graphBuilder, state.graph],
  );

  if (!authLoading && !userLoading && !canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem acesso a grupos.</div>;
  }

  return (
    <EntityModuleShell
      moduleDefinition={projectGroupsListModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      favoriteSnapshot={favoriteSnapshot}
      isLoading={loading}
      totalCount={filteredRows.length}
      canCreate={canCreate}
      onCreate={() =>
        router.push(withTenantPath(`${PROJECT_GROUPS_ROUTES.list}/new`, tenantSlug))
      }
      onRefresh={() => setRefreshKey((previous) => previous + 1)}
    >
      {error ? <div className="px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {state.view === "kanban" ? (
        <KanbanView
          items={filteredRows}
          getColumnKey={(group) => group.project?.name ?? "Sem projeto"}
          getColumnLabel={(value) => value}
          renderCard={(group) => (
            <button type="button" className="w-full rounded-md border border-border/60 bg-background px-3 py-3 text-left" onClick={() => openDetail(group)}>
              <div className="truncate text-sm font-medium text-foreground">{group.name}</div>
              <div className="mt-2 text-xs text-muted-foreground">{group.project?.name ?? "-"}</div>
            </button>
          )}
        />
      ) : state.view === "graph" && graphModel ? (
        <GraphView
          data={graphModel.data}
          xKey={graphModel.xKey}
          chartType={graphModel.chartType}
          series={graphModel.series}
          height={420}
          emptyState={graphModel.emptyState}
          downloadFileName={graphModel.downloadFileName}
        />
      ) : (
        <>
          <ListView
            data={pagedRows}
            columns={columnDefs}
            onRowClick={openDetail}
            groupByFields={state.groupBy}
          />
          <PaginationBar
            pageIndex={state.pageIndex}
            pageCount={pageCount}
            pageSize={state.pageSize}
            onPageIndexChange={(next) => setState((previous) => ({ ...previous, pageIndex: next }))}
            onPageSizeChange={(next) => setState((previous) => ({ ...previous, pageSize: next, pageIndex: 0 }))}
          />
        </>
      )}
    </EntityModuleShell>
  );
}
