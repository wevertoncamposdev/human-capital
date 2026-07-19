"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { ADMIN_ROUTES } from "@/modules/core/admin/admin.constants";
import type { AdminAuditRecord } from "@/modules/core/admin/admin.types";
import {
  adminAuditListModuleDefinition,
  type AdminAuditListQueryState,
  type AdminAuditListViewId,
} from "@/modules/core/admin/config/admin-module-contract";
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
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import { parseDomain, serializeDomain } from "@/web-client/domain/serialize";
import { EntityModuleShell } from "@/web-client/record/RecordListHost";
import {
  getModuleGraphBuilderConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";
import { useModuleQueryState } from "@/web-client/screen/useModuleQueryState";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { CalendarView } from "@/web-client/views/CalendarView";
import { GraphView } from "@/web-client/views/GraphView";
import { ListView } from "@/web-client/views/ListView";
import { TimelineView } from "@/web-client/views/TimelineView";

function AuditCalendarItem({ log }: { log: AdminAuditRecord }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <div className="truncate text-sm font-medium text-foreground">
        {log.entity} • {log.action}
      </div>
      <div className="mt-2 grid gap-1 text-[12px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Usuario</span>
          <span className="truncate text-foreground">{log.userName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Data</span>
          <span className="text-foreground">{formatDateTimeLabel(log.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function AuditTimelineTitle({
  log,
  onOpen,
}: {
  log: AdminAuditRecord;
  onOpen: (log: AdminAuditRecord) => void;
}) {
  return (
    <button
      type="button"
      className="truncate text-left text-sm font-medium text-foreground hover:text-primary"
      onClick={() => onOpen(log)}
    >
      {log.entity} • {log.action}
    </button>
  );
}

function AuditTimelineBody({
  log,
  onOpen,
}: {
  log: AdminAuditRecord;
  onOpen: (log: AdminAuditRecord) => void;
}) {
  return (
    <button
      type="button"
      className="text-left text-[13px] text-muted-foreground hover:text-foreground"
      onClick={() => onOpen(log)}
    >
      {log.userName} • {trimText(log.entityId)}
    </button>
  );
}

function AuditCalendarCard({
  log,
  onOpen,
}: {
  log: AdminAuditRecord;
  onOpen: (log: AdminAuditRecord) => void;
}) {
  return (
    <button type="button" className="block w-full text-left" onClick={() => onOpen(log)}>
      <AuditCalendarItem log={log} />
    </button>
  );
}

function auditColumns(): ColumnDef<AdminAuditRecord>[] {
  return [
    {
      accessorKey: "action",
      header: "Acao",
      cell: ({ row }) => <span className="text-foreground">{row.original.action}</span>,
    },
    {
      accessorKey: "entity",
      header: "Entidade",
      cell: ({ row }) => <span className="text-foreground">{row.original.entity}</span>,
    },
    {
      accessorKey: "entityId",
      header: "ID entidade",
      cell: ({ row }) => <span className="font-mono text-foreground">{trimText(row.original.entityId)}</span>,
    },
    {
      accessorKey: "userName",
      header: "Usuario",
      cell: ({ row }) => <span className="text-foreground">{row.original.userName}</span>,
    },
    {
      accessorKey: "userEmail",
      header: "Email",
      cell: ({ row }) => <span className="text-foreground">{trimText(row.original.userEmail)}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: ({ row }) => <span className="text-foreground">{formatDateTimeLabel(row.original.createdAt)}</span>,
    },
    {
      accessorKey: "ipAddress",
      header: "IP",
      cell: ({ row }) => <span className="text-foreground">{trimText(row.original.ipAddress)}</span>,
    },
  ];
}

export function AdminAuditListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const graphBuilder = getModuleGraphBuilderConfig(adminAuditListModuleDefinition);
  const columns = React.useMemo(() => auditColumns(), []);
  const canRead = hasModulePermission(adminAuditListModuleDefinition, "canRead", permissions);

  const [rows, setRows] = React.useState<AdminAuditRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [state, setState] = useModuleQueryState<AdminAuditListQueryState>({
    moduleDefinition: adminAuditListModuleDefinition,
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
        defaultState: adminAuditListModuleDefinition.defaultQueryState,
        allowedViews: ["list", "timeline", "calendar", "graph"],
        parseDomain: (value) => parseDomain(value) ?? null,
        graphBuilder,
      }) as AdminAuditListQueryState,
    serialize: (nextState) =>
      serializeAdminCollectionState(
        nextState,
        adminAuditListModuleDefinition.defaultQueryState,
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
      const response = await dataProvider.search<AdminAuditRecord>(
        adminAuditListModuleDefinition.queryAdapters.listDataProvider.model,
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
          : "Falha ao carregar auditoria.";
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
        searchView: adminAuditListModuleDefinition.searchConfig,
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
        moduleDefinition: adminAuditListModuleDefinition,
        state,
        setState,
        rows: rows as Array<Record<string, unknown>>,
      }),
    [rows, setState, state],
  );

  const analysisFacets = React.useMemo(
    () =>
      buildAnalysisFacets({
        moduleDefinition: adminAuditListModuleDefinition,
        state,
        setState,
      }),
    [setState, state],
  );

  const graphModel = React.useMemo(
    () => buildGraphModel(rows as Array<Record<string, unknown>>, state, adminAuditListModuleDefinition),
    [rows, state],
  );

  const openDetail = React.useCallback(
    (log: AdminAuditRecord) => {
      router.push(withTenantPath(`${ADMIN_ROUTES.audit}/${log.id}`, tenantSlug));
    },
    [router, tenantSlug],
  );

  if (!canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem permissao para acessar esta area.</div>;
  }

  return (
    <EntityModuleShell<AdminAuditListQueryState, AdminFavoriteState<AdminAuditListViewId>>
      moduleDefinition={adminAuditListModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      analysisFacets={analysisFacets}
      favoriteSnapshot={buildFavoriteSnapshot(state)}
      mapFavoriteToState={(snapshot) => snapshot}
      isLoading={loading}
      onRefresh={loadRows}
      totalCount={totalCount}
      analysisSlot={analysisSlot}
      hasActiveAnalysis={hasActiveAnalysis(adminAuditListModuleDefinition, state)}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          timelineField: adminAuditListModuleDefinition.defaultQueryState.timelineField,
          timelineSortDirection:
            adminAuditListModuleDefinition.defaultQueryState.timelineSortDirection,
          calendarField: adminAuditListModuleDefinition.defaultQueryState.calendarField,
          calendarMode: adminAuditListModuleDefinition.defaultQueryState.calendarMode,
          rangeFrom: adminAuditListModuleDefinition.defaultQueryState.rangeFrom,
          rangeTo: adminAuditListModuleDefinition.defaultQueryState.rangeTo,
          graph: adminAuditListModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? (
        renderLoadingState(error)
      ) : loading ? (
        renderLoadingState("Carregando auditoria...")
      ) : state.view === "timeline" ? (
        <TimelineView
          items={rows}
          getDate={(log) => toDate(log.createdAt)}
          renderTitle={(log) => <AuditTimelineTitle log={log} onOpen={openDetail} />}
          renderBody={(log) => <AuditTimelineBody log={log} onOpen={openDetail} />}
          sortDirection={state.timelineSortDirection}
        />
      ) : state.view === "calendar" ? (
        <CalendarView
          items={rows}
          getDate={(log) => toDate(log.createdAt)}
          renderItem={(log) => <AuditCalendarCard log={log} onOpen={openDetail} />}
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
          <ListView<AdminAuditRecord>
            data={pagedRows}
            columns={columns}
            getRowId={(row) => row.id}
            groupByFields={state.groupBy}
            resolveGroupLabel={(_field, value) => trimText(value, "Sem valor")}
            initialColumnPinning={{ left: ["action"] }}
            onRowClick={openDetail}
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
