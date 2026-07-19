"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import {
  adminPermissionsListModuleDefinition,
  type AdminPermissionsListQueryState,
  type AdminPermissionsListViewId,
} from "@/modules/core/admin/config/admin-module-contract";
import type { AdminPermissionRecord } from "@/modules/core/admin/admin.types";
import {
  buildAnalysisFacets,
  buildAnalysisSlot,
  buildFavoriteSnapshot,
  buildGraphModel,
  hasActiveAnalysis,
  parseAdminCollectionState,
  renderLoadingState,
  serializeAdminCollectionState,
  trimText,
  type AdminFavoriteState,
} from "@/modules/core/admin/ui/admin-list-shared";
import { createRestDataProvider } from "@/web-client/data-provider";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import { parseDomain, serializeDomain } from "@/web-client/domain/serialize";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { EntityModuleShell } from "@/web-client/record/RecordListHost";
import {
  getModuleGraphBuilderConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";
import { useModuleQueryState } from "@/web-client/screen/useModuleQueryState";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { GraphView } from "@/web-client/views/GraphView";
import { ListView } from "@/web-client/views/ListView";
import { formatDateTimePtBR } from "@/lib/date";

function permissionColumns(): ColumnDef<AdminPermissionRecord>[] {
  return [
    {
      accessorKey: "key",
      header: "Chave",
      cell: ({ row }) => <span className="font-mono text-foreground">{row.original.key}</span>,
    },
    {
      accessorKey: "moduleLabel",
      header: "Modulo",
      cell: ({ row }) => <span className="text-foreground">{row.original.moduleLabel}</span>,
    },
    {
      accessorKey: "action",
      header: "Acao",
      cell: ({ row }) => <span className="text-foreground">{trimText(row.original.action)}</span>,
    },
    {
      accessorKey: "description",
      header: "Descricao",
      cell: ({ row }) => <span className="text-foreground">{trimText(row.original.description)}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      cell: ({ row }) => <span className="text-foreground">{formatDateTimePtBR(row.original.createdAt ?? null) || "-"}</span>,
    },
  ];
}

export function AdminPermissionsListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const graphBuilder = getModuleGraphBuilderConfig(adminPermissionsListModuleDefinition);
  const columns = React.useMemo(() => permissionColumns(), []);
  const canRead = hasModulePermission(adminPermissionsListModuleDefinition, "canRead", permissions);

  const [rows, setRows] = React.useState<AdminPermissionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [state, setState] = useModuleQueryState<AdminPermissionsListQueryState>({
    moduleDefinition: adminPermissionsListModuleDefinition,
    trackedKeys: [
      "view",
      "q",
      "d",
      "g",
      "page",
      "limit",
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
        defaultState: adminPermissionsListModuleDefinition.defaultQueryState,
        allowedViews: ["list", "graph"],
        parseDomain: (value) => parseDomain(value) ?? null,
        graphBuilder,
      }) as AdminPermissionsListQueryState,
    serialize: (nextState) =>
      serializeAdminCollectionState(
        nextState,
        adminPermissionsListModuleDefinition.defaultQueryState,
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
      const response = await dataProvider.search<AdminPermissionRecord>(
        adminPermissionsListModuleDefinition.queryAdapters.listDataProvider.model,
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
          : "Falha ao carregar permissoes.";
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
        searchView: adminPermissionsListModuleDefinition.searchConfig,
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
        moduleDefinition: adminPermissionsListModuleDefinition,
        state,
        setState,
        rows: rows as Array<Record<string, unknown>>,
      }),
    [rows, setState, state],
  );

  const analysisFacets = React.useMemo(
    () =>
      buildAnalysisFacets({
        moduleDefinition: adminPermissionsListModuleDefinition,
        state,
        setState,
      }),
    [setState, state],
  );

  const graphModel = React.useMemo(
    () => buildGraphModel(rows as Array<Record<string, unknown>>, state, adminPermissionsListModuleDefinition),
    [rows, state],
  );

  if (!canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem permissao para acessar esta area.</div>;
  }

  return (
    <EntityModuleShell<AdminPermissionsListQueryState, AdminFavoriteState<AdminPermissionsListViewId>>
      moduleDefinition={adminPermissionsListModuleDefinition}
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
      hasActiveAnalysis={hasActiveAnalysis(adminPermissionsListModuleDefinition, state)}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          graph: adminPermissionsListModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? (
        renderLoadingState(error)
      ) : loading ? (
        renderLoadingState("Carregando permissoes...")
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
          <ListView<AdminPermissionRecord>
            data={pagedRows}
            columns={columns}
            getRowId={(row) => row.id}
            groupByFields={state.groupBy}
            resolveGroupLabel={(_field, value) => trimText(value, "Sem valor")}
            initialColumnPinning={{ left: ["key"] }}
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
