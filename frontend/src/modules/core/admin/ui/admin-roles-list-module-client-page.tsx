"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { ADMIN_ROUTES } from "@/modules/core/admin/admin.constants";
import {
  adminRolesListModuleDefinition,
  type AdminRolesListQueryState,
  type AdminRolesListViewId,
} from "@/modules/core/admin/config/admin-module-contract";
import type { AdminRoleRecord } from "@/modules/core/admin/admin.types";
import {
  buildAnalysisFacets,
  buildAnalysisSlot,
  buildFavoriteSnapshot,
  buildGraphModel,
  formatDateTimeLabel,
  hasActiveAnalysis,
  parseAdminCollectionState,
  renderLoadingState,
  serializeAdminCollectionState,
  toDate,
  trimText,
  type AdminFavoriteState,
} from "@/modules/core/admin/ui/admin-list-shared";
import { createRestDataProvider } from "@/web-client/data-provider";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import { parseDomain, serializeDomain } from "@/web-client/domain/serialize";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { EntityModuleShell } from "@/web-client/record/RecordListHost";
import {
  canUseModuleAction,
  getModuleGraphBuilderConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";
import { useModuleQueryState } from "@/web-client/screen/useModuleQueryState";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { CalendarView } from "@/web-client/views/CalendarView";
import { GraphView } from "@/web-client/views/GraphView";
import { ListView } from "@/web-client/views/ListView";
import { TimelineView } from "@/web-client/views/TimelineView";

function RoleCalendarItem({ role }: { role: AdminRoleRecord }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <div className="truncate text-sm font-medium text-foreground">{role.name}</div>
      <div className="mt-2 grid gap-1 text-[12px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Permissoes</span>
          <span className="text-foreground">{role.permissionCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Modulos</span>
          <span className="text-foreground">{role.moduleCount}</span>
        </div>
      </div>
    </div>
  );
}

function roleColumns(): ColumnDef<AdminRoleRecord>[] {
  return [
    {
      accessorKey: "name",
      header: "Perfil",
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: "description",
      header: "Descricao",
      cell: ({ row }) => <span className="text-foreground">{trimText(row.original.description)}</span>,
    },
    {
      accessorKey: "moduleCount",
      header: "Qtd. modulos",
      cell: ({ row }) => <span className="text-foreground">{row.original.moduleCount}</span>,
    },
    {
      accessorKey: "permissionCount",
      header: "Qtd. permissoes",
      cell: ({ row }) => <span className="text-foreground">{row.original.permissionCount}</span>,
    },
    {
      accessorKey: "modules",
      header: "Modulos",
      cell: ({ row }) => <span className="text-foreground">{row.original.modules.join(", ") || "-"}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      cell: ({ row }) => <span className="text-foreground">{formatDateTimeLabel(row.original.createdAt)}</span>,
    },
  ];
}

function resolveRoleGroupLabel(_field: string, value: unknown) {
  return trimText(value, "Sem valor");
}

export function AdminRolesListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const graphBuilder = getModuleGraphBuilderConfig(adminRolesListModuleDefinition);
  const columns = React.useMemo(() => roleColumns(), []);

  const canRead = hasModulePermission(adminRolesListModuleDefinition, "canRead", permissions);
  const canCreate = canUseModuleAction(adminRolesListModuleDefinition, "create", permissions);

  const [rows, setRows] = React.useState<AdminRoleRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [state, setState] = useModuleQueryState<AdminRolesListQueryState>({
    moduleDefinition: adminRolesListModuleDefinition,
    trackedKeys: [
      "view",
      "q",
      "d",
      "g",
      "page",
      "limit",
      "timelineField",
      "timelineSort",
      "calendarField",
      "calendarMode",
      "rangeFrom",
      "rangeTo",
      "graphGroupBy",
      "graphMetricField",
      "graphMetricOp",
      "graphTimeField",
      "graphTimeBucket",
      "graphChartType",
      "graphFilters",
    ],
    parse: (params) =>
      parseAdminCollectionState({
        params,
        defaultState: adminRolesListModuleDefinition.defaultQueryState,
        allowedViews: ["list", "timeline", "calendar", "graph"],
        parseDomain: (value) => parseDomain(value) ?? null,
        graphBuilder,
      }) as AdminRolesListQueryState,
    serialize: (nextState) =>
      serializeAdminCollectionState(
        nextState,
        adminRolesListModuleDefinition.defaultQueryState,
        serializeDomain,
        graphBuilder,
      ),
  });

  const loadRows = React.useCallback(async () => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }

    if (!token || !canRead) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await dataProvider.search<AdminRoleRecord>(
        adminRolesListModuleDefinition.queryAdapters.listDataProvider.model,
        {
          searchText: state.searchText,
          domain: state.domain,
          groupBy: state.groupBy,
          all: true,
        },
      );
      setRows(response.data);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar perfis.";
      setRows([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canRead, dataProvider, state.domain, state.groupBy, state.searchText, token, userLoading]);

  React.useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const totalCount = rows.length;
  const pageCount = Math.max(Math.ceil(Math.max(totalCount, 1) / state.pageSize), 1);
  const pageStart = state.pageIndex * state.pageSize;
  const pagedRows = rows.slice(pageStart, pageStart + state.pageSize);

  const openCreate = React.useCallback(() => {
    router.push(withTenantPath(ADMIN_ROUTES.rolesNew, tenantSlug));
  }, [router, tenantSlug]);

  const openDetail = React.useCallback(
    (role: AdminRoleRecord) => {
      router.push(withTenantPath(`${ADMIN_ROUTES.roles}/${role.id}`, tenantSlug));
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
        searchView: adminRolesListModuleDefinition.searchConfig,
        onClearGroupBy: () => setState((previous) => ({ ...previous, groupBy: [] })),
        onClearDomain: () =>
          setState((previous) => ({ ...previous, domain: null, pageIndex: 0 })),
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [removeDomainCondition, setState, state.domain, state.groupBy],
  );

  const analysisSlot = React.useMemo(
    () =>
      buildAnalysisSlot({
        moduleDefinition: adminRolesListModuleDefinition,
        state,
        setState,
        rows: rows as Array<Record<string, unknown>>,
      }),
    [rows, setState, state],
  );

  const analysisFacets = React.useMemo(
    () =>
      buildAnalysisFacets({
        moduleDefinition: adminRolesListModuleDefinition,
        state,
        setState,
      }),
    [setState, state],
  );

  const valueSuggestions = React.useMemo(() => {
    const modules = Array.from(
      new Set(rows.flatMap((row) => row.modules.map((entry) => entry.trim()).filter(Boolean))),
    ).sort((left, right) => left.localeCompare(right));

    return (fieldName: string) => {
      if (fieldName === "modules") return modules;
      return [];
    };
  }, [rows]);

  const graphModel = React.useMemo(
    () => buildGraphModel(rows as Array<Record<string, unknown>>, state, adminRolesListModuleDefinition),
    [rows, state],
  );

  if (!canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem permissao para acessar esta area.</div>;
  }

  return (
    <EntityModuleShell<AdminRolesListQueryState, AdminFavoriteState<AdminRolesListViewId>>
      moduleDefinition={adminRolesListModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      analysisFacets={analysisFacets}
      valueSuggestions={valueSuggestions}
      favoriteSnapshot={buildFavoriteSnapshot(state)}
      mapFavoriteToState={(snapshot) => snapshot}
      isLoading={loading}
      onRefresh={loadRows}
      totalCount={totalCount}
      onCreate={openCreate}
      canCreate={canCreate}
      analysisSlot={analysisSlot}
      hasActiveAnalysis={hasActiveAnalysis(adminRolesListModuleDefinition, state)}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          timelineField: adminRolesListModuleDefinition.defaultQueryState.timelineField,
          timelineSortDirection:
            adminRolesListModuleDefinition.defaultQueryState.timelineSortDirection,
          calendarField: adminRolesListModuleDefinition.defaultQueryState.calendarField,
          calendarMode: adminRolesListModuleDefinition.defaultQueryState.calendarMode,
          rangeFrom: adminRolesListModuleDefinition.defaultQueryState.rangeFrom,
          rangeTo: adminRolesListModuleDefinition.defaultQueryState.rangeTo,
          graph: adminRolesListModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? (
        renderLoadingState(error)
      ) : loading ? (
        renderLoadingState("Carregando perfis...")
      ) : state.view === "timeline" ? (
        <TimelineView
          items={rows}
          getDate={(role) => toDate(role[state.timelineField as keyof AdminRoleRecord] as string | null | undefined)}
          renderTitle={(role) => role.name}
          renderBody={(role) => `${role.permissionCount} permissoes • ${role.moduleCount} modulos`}
          sortDirection={state.timelineSortDirection}
        />
      ) : state.view === "calendar" ? (
        <CalendarView
          items={rows}
          getDate={(role) => toDate(role[state.calendarField as keyof AdminRoleRecord] as string | null | undefined)}
          renderItem={(role) => <RoleCalendarItem role={role} />}
          mode={state.calendarMode}
          onModeChange={(calendarMode) =>
            setState((previous) => ({ ...previous, calendarMode }))
          }
          showModeSelect={false}
          showDateFieldSelect={false}
          showRangeInputs={false}
        />
      ) : state.view === "graph" ? (
        graphModel ? (
          <GraphView
            data={graphModel.data}
            xKey={graphModel.xKey}
            chartType={graphModel.chartType}
            series={graphModel.series}
            height={420}
            emptyState={graphModel.emptyState}
            downloadFileName={graphModel.downloadFileName}
          />
        ) : null
      ) : (
        <>
          <ListView<AdminRoleRecord>
            data={pagedRows}
            columns={columns}
            getRowId={(row) => row.id}
            groupByFields={state.groupBy}
            resolveGroupLabel={resolveRoleGroupLabel}
            onRowClick={openDetail}
            initialColumnPinning={{ left: ["name"] }}
          />

          <PaginationBar
            pageIndex={state.pageIndex}
            pageSize={state.pageSize}
            pageCount={pageCount}
            onPageIndexChange={(pageIndex) =>
              setState((previous) => ({ ...previous, pageIndex }))
            }
            onPageSizeChange={(pageSize) =>
              setState((previous) => ({ ...previous, pageSize, pageIndex: 0 }))
            }
          />
        </>
      )}
    </EntityModuleShell>
  );
}
