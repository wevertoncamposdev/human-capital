"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import type { ApiPeopleSegment } from "@/modules/people-segments/api";
import {
  peopleSegmentsListModuleDefinition,
  type PeopleSegmentsListQueryState,
} from "@/modules/people-segments/config/people-segments-module-contract";
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
import { ListView } from "@/web-client/views/ListView";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseState(params: URLSearchParams): PeopleSegmentsListQueryState {
  return {
    ...peopleSegmentsListModuleDefinition.defaultQueryState,
    view: (params.get("view") as PeopleSegmentsListQueryState["view"]) ?? "table",
    searchText: params.get("q") ?? "",
    domain: parseDomain(params.get("d")) ?? null,
    groupBy: (params.get("g") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    pageIndex: parsePositiveInt(params.get("page"), 1) - 1,
    pageSize: Math.min(Math.max(parsePositiveInt(params.get("limit"), 20), 1), 100),
    graph: peopleSegmentsListModuleDefinition.defaultQueryState.graph,
  };
}

function serializeState(state: PeopleSegmentsListQueryState) {
  return {
    view: state.view === "table" ? undefined : state.view,
    q: state.searchText.trim() || undefined,
    d: state.domain ? serializeDomain(state.domain) : undefined,
    g: state.groupBy.length ? state.groupBy.join(",") : undefined,
    page: state.pageIndex > 0 ? String(state.pageIndex + 1) : undefined,
    limit: state.pageSize === 20 ? undefined : String(state.pageSize),
  };
}

function formatStatus(isActive: boolean) {
  return isActive ? "Ativo" : "Inativo";
}

function formatAgeRange(ageMin: number | null | undefined, ageMax: number | null | undefined) {
  if (ageMin == null && ageMax == null) return "Livre";
  return `${ageMin ?? "-"} a ${ageMax ?? "-"}`;
}

function formatPurpose(purpose: ApiPeopleSegment["purpose"]) {
  return purpose === "EQUIPE" ? "Equipe" : "Público";
}

function formatCreatedAt(value: string | null | undefined) {
  if (!value) return "-";
  return value.slice(0, 10).split("-").reverse().join("/");
}

function resolveGroupLabel(field: string, value: unknown) {
  if (field === "purpose") {
    return formatPurpose(value as ApiPeopleSegment["purpose"]);
  }
  if (field === "isActive") {
    return value === false ? "Inativos" : "Ativos";
  }
  if (field === "createdAt") {
    return typeof value === "string" && value ? formatCreatedAt(value) : "Sem cadastro";
  }
  const label = String(value ?? "").trim();
  return label || "Sem valor";
}

function columns(): ColumnDef<ApiPeopleSegment>[] {
  return [
    {
      accessorKey: "name",
      header: "Grupo de Pessoas",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-medium text-foreground">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">
            {formatAgeRange(row.original.ageMin, row.original.ageMax)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "purpose",
      header: "Finalidade",
      cell: ({ row }) => formatPurpose(row.original.purpose),
    },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => row.original.category ?? "-",
    },
    {
      accessorKey: "createdAt",
      header: "Cadastro",
      cell: ({ row }) => formatCreatedAt(row.original.createdAt),
    },
    {
      id: "memberships",
      header: "Participantes",
      accessorFn: (row) => row._count?.memberships ?? 0,
      meta: { dataType: "number" },
      cell: ({ row }) => row.original._count?.memberships ?? 0,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => formatStatus(row.original.isActive),
    },
  ];
}

export function PeopleSegmentsListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname) ?? "";
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const columnDefs = React.useMemo(() => columns(), []);
  const canRead = hasModulePermission(peopleSegmentsListModuleDefinition, "canRead", permissions);
  const canCreate = hasModulePermission(peopleSegmentsListModuleDefinition, "canCreate", permissions);

  const [rows, setRows] = React.useState<ApiPeopleSegment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [state, setState] = useModuleQueryState<PeopleSegmentsListQueryState>({
    moduleDefinition: peopleSegmentsListModuleDefinition,
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
      .search<ApiPeopleSegment>("people-segments.list", {
        searchText: state.searchText,
        all: true,
      })
      .then((result) => setRows(result.data))
      .catch((nextError) => {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao carregar grupos de pessoas.";
        setRows([]);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [authLoading, canRead, dataProvider, state.searchText, token, userLoading]);

  const filteredRows = React.useMemo(() => {
    if (!state.domain) return rows;
    return rows.filter((row) =>
      matchesDomainRecord(
        {
          purpose: row.purpose ?? "PUBLICO",
          category: row.category ?? null,
          createdAt: row.createdAt?.slice(0, 10) ?? null,
          isActive: row.isActive,
        },
        state.domain,
        (current, field) => current[field as keyof typeof current],
      ),
    );
  }, [rows, state.domain]);

  const pagedRows = React.useMemo(() => {
    const start = state.pageIndex * state.pageSize;
    return filteredRows.slice(start, start + state.pageSize);
  }, [filteredRows, state.pageIndex, state.pageSize]);
  const pageCount = Math.max(Math.ceil(Math.max(filteredRows.length, 1) / state.pageSize), 1);

  const openDetail = React.useCallback(
    (segment: ApiPeopleSegment) => {
      router.push(withTenantPath(`/people-groups/${segment.id}`, tenantSlug));
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
        searchView: peopleSegmentsListModuleDefinition.searchConfig,
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
    const graphoiew = peopleSegmentsListModuleDefinition.views.find(
      (view) => view.id === "graph" && view.viewType === "graph",
    );
    return graphoiew?.viewType === "graph" ? graphoiew.params?.builder : undefined;
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
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Você não tem acesso a grupos de pessoas.
      </div>
    );
  }

  return (
    <EntityModuleShell
      moduleDefinition={peopleSegmentsListModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      favoriteSnapshot={favoriteSnapshot}
      isLoading={loading}
      totalCount={filteredRows.length}
      canCreate={canCreate}
      onCreate={() => router.push(withTenantPath("/people-groups/new", tenantSlug))}
      onRefresh={() => setState((previous) => ({ ...previous }))}
    >
      {error ? <div className="px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {state.view === "graph" && graphModel ? (
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
            groupByFields={state.groupBy}
            resolveGroupLabel={resolveGroupLabel}
            onRowClick={openDetail}
            getRowId={(row) => row.id}
            initialColumnPinning={{ left: ["name"] }}
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
