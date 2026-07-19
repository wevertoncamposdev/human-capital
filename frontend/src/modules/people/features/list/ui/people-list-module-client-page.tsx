"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import type { ApiPerson } from "@/modules/people/api";
import {
  buildAnalysisFacets,
  buildAnalysisSlot,
  buildFavoriteSnapshot,
  buildGraphModel,
  hasActiveAnalysis,
  parseAdminCollectionState,
  serializeAdminCollectionState,
  toDate,
  type AdminFavoriteState,
} from "@/modules/core/admin/ui/admin-list-shared";
import {
  peopleListModuleDefinition,
  type PeopleListQueryState,
} from "@/modules/people/config/people-module-contract";
import { mapApiPersonToTableItem } from "@/modules/people/shared/domain/people-module.helpers";
import type { PeopleTableItem } from "@/modules/people/shared/domain/types";
import {
  formatDate,
  resolvePersonDisplayNames,
} from "@/modules/people/shared/domain/utils";
import { usePeopleColumns } from "@/modules/people/features/list/ui/columns";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { createRestDataProvider } from "@/web-client/data-provider";
import {
  removeConditionAtIndex,
} from "@/web-client/domain/conditions";
import { parseDomain, serializeDomain } from "@/web-client/domain/serialize";
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
import { KanbanView } from "@/web-client/views/KanbanView";
import { ListView } from "@/web-client/views/ListView";
import { TimelineView } from "@/web-client/views/TimelineView";

function resolveGroupLabel(field: string, value: unknown) {
  switch (field) {
    case "status":
      return String(value ?? "Sem status");
    case "personType":
      return String(value ?? "Sem tipo");
    case "sex":
      return String(value ?? "Nao informado");
    case "gender":
      return String(value ?? "Nao informado");
    case "raceColor":
      return String(value ?? "Nao informado");
    case "hasHealthCondition":
      return value ? "Com condicao" : "Sem condicao";
    case "hasMedication":
      return value ? "Com medicacao" : "Sem medicacao";
    case "createdAt":
      return formatDate(typeof value === "string" ? value : null) || "Sem data";
    default:
      return String(value ?? "Sem valor").trim() || "Sem valor";
  }
}

function resolveKanbanColumnValue(person: PeopleTableItem, field: string) {
  switch (field) {
    case "personType":
      return person.personType ?? "Sem tipo";
    case "sex":
      return person.sex ?? "Nao informado";
    case "gender":
      return person.gender ?? "Nao informado";
    case "raceColor":
      return person.raceColor ?? "Nao informado";
    case "maritalStatus":
      return person.maritalStatus ?? "Nao informado";
    case "nationality":
      return person.nationality ?? "Nao informada";
    case "hasHealthCondition":
      return person.hasHealthCondition ? "Com condicao" : "Sem condicao";
    case "hasMedication":
      return person.hasMedication ? "Com medicacao" : "Sem medicacao";
    case "status":
    default:
      return person.status ?? "Sem status";
  }
}

function PeopleCard({ person }: { person: PeopleTableItem }) {
  const displayNames = resolvePersonDisplayNames(person.fullName, person.socialName);

  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {displayNames.primary}
          </div>
          {displayNames.secondary ? (
            <div className="truncate text-xs text-muted-foreground">
              {displayNames.secondary}
            </div>
          ) : null}
        </div>

        <Badge variant="outline" className="rounded-full px-2 text-[10px]">
          {person.status ?? "Sem status"}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>{person.personType ?? "Sem tipo"}</span>
        <span>•</span>
        <span>{formatDate(person.birthDate) || "Sem nascimento"}</span>
      </div>
    </div>
  );
}

export function PeopleListModuleClientPage() {
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const canRead = hasModulePermission(
    peopleListModuleDefinition,
    "canRead",
    permissions,
  );
  const canCreate = canUseModuleAction(
    peopleListModuleDefinition,
    "create",
    permissions,
  );

  const dataProvider = React.useMemo(
    () => createRestDataProvider({ token }),
    [token],
  );
  const graphBuilder = getModuleGraphBuilderConfig(peopleListModuleDefinition);
  const columns = usePeopleColumns();

  const [rows, setRows] = React.useState<PeopleTableItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  const [state, setState] = useModuleQueryState<PeopleListQueryState>({
    moduleDefinition: peopleListModuleDefinition,
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
        defaultState: peopleListModuleDefinition.defaultQueryState,
        allowedViews: ["list", "kanban", "timeline", "calendar", "graph"],
        parseDomain: (value) => parseDomain(value) ?? null,
        graphBuilder,
      }) as PeopleListQueryState,
    serialize: (nextState) =>
      serializeAdminCollectionState(
        nextState,
        peopleListModuleDefinition.defaultQueryState,
        serializeDomain,
        graphBuilder,
      ),
  });

  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const resetPaginationKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(state.searchText.trim());
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [state.searchText]);

  React.useEffect(() => {
    const key = `${debouncedSearch}::${state.domain ? serializeDomain(state.domain) : ""}`;
    if (resetPaginationKeyRef.current === null) {
      resetPaginationKeyRef.current = key;
      return;
    }
    if (resetPaginationKeyRef.current === key) return;
    resetPaginationKeyRef.current = key;
    setState((previous) =>
      previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
    );
  }, [debouncedSearch, setState, state.domain]);

  const loadRows = React.useCallback(async () => {
    if (!token || !canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await dataProvider.search<ApiPerson>(
        peopleListModuleDefinition.queryAdapters.listDataProvider.model,
        {
          searchText: debouncedSearch,
          domain: state.domain,
          groupBy: state.groupBy,
          pagination: {
            pageIndex: state.pageIndex,
            pageSize: state.pageSize,
          },
        },
      );

      setRows(response.data.map(mapApiPersonToTableItem));
      setPageCount(Math.max(response.pagination?.pages ?? 1, 1));
      setTotalCount(response.pagination?.total ?? response.data.length);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar pessoas.";

      setRows([]);
      setPageCount(1);
      setTotalCount(0);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    canRead,
    dataProvider,
    debouncedSearch,
    state.domain,
    state.groupBy,
    state.pageIndex,
    state.pageSize,
    token,
  ]);

  React.useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const openCreate = React.useCallback(() => {
    router.push(withTenantPath("/people/new", tenantSlug));
  }, [router, tenantSlug]);

  const openDetail = React.useCallback(
    (person: PeopleTableItem) => {
      router.push(withTenantPath(`/people/${person.id}`, tenantSlug));
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
        searchView: peopleListModuleDefinition.searchConfig,
        onClearGroupBy: () => setState((previous) => ({ ...previous, groupBy: [] })),
        onClearDomain: () =>
          setState((previous) => ({
            ...previous,
            domain: null,
            pageIndex: 0,
          })),
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [removeDomainCondition, setState, state.domain, state.groupBy],
  );

  const valueSuggestions = React.useMemo(() => {
    const statuses = new Set<string>();
    const tags = new Set<string>();
    const nationalities = new Set<string>();

    rows.forEach((row) => {
      if (row.status) statuses.add(row.status);
      if (row.nationality?.trim()) nationalities.add(row.nationality.trim());
      (row.tags ?? []).forEach((tag) => {
        const cleaned = tag.trim();
        if (cleaned) tags.add(cleaned);
      });
    });

    const statusList = Array.from(statuses).sort((left, right) => left.localeCompare(right));
    const nationalityList = Array.from(nationalities).sort((left, right) =>
      left.localeCompare(right),
    );
    const tagList = Array.from(tags).sort((left, right) => left.localeCompare(right));

    return (fieldName: string) => {
      if (fieldName === "status") return statusList;
      if (fieldName === "nationality") return nationalityList;
      if (fieldName === "tags") return tagList;
      return [];
    };
  }, [rows]);

  const analysisSlot = React.useMemo(
    () =>
      buildAnalysisSlot({
        moduleDefinition: peopleListModuleDefinition,
        state,
        setState,
        rows: rows as Array<Record<string, unknown>>,
      }),
    [rows, setState, state],
  );

  const analysisFacets = React.useMemo(
    () =>
      buildAnalysisFacets({
        moduleDefinition: peopleListModuleDefinition,
        state,
        setState,
      }),
    [setState, state],
  );

  const graphModel = React.useMemo(
    () =>
      buildGraphModel(
        rows as Array<Record<string, unknown>>,
        state,
        peopleListModuleDefinition,
      ),
    [rows, state],
  );

  if (!canRead) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Voce nao tem permissao para acessar esta area.
      </div>
    );
  }

  return (
    <EntityModuleShell<PeopleListQueryState, AdminFavoriteState<PeopleListQueryState["view"]>>
      moduleDefinition={peopleListModuleDefinition}
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
      hasActiveAnalysis={hasActiveAnalysis(peopleListModuleDefinition, state)}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          timelineField: peopleListModuleDefinition.defaultQueryState.timelineField,
          timelineSortDirection:
            peopleListModuleDefinition.defaultQueryState.timelineSortDirection,
          calendarField: peopleListModuleDefinition.defaultQueryState.calendarField,
          calendarMode: peopleListModuleDefinition.defaultQueryState.calendarMode,
          rangeFrom: peopleListModuleDefinition.defaultQueryState.rangeFrom,
          rangeTo: peopleListModuleDefinition.defaultQueryState.rangeTo,
          graph: peopleListModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? (
        <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : loading && !rows.length ? (
        <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : state.view === "kanban" ? (
        <KanbanView
          items={rows}
          getColumnKey={(person) => resolveKanbanColumnValue(person, state.groupBy[0] ?? "status")}
          getColumnLabel={(value) => String(value ?? "Sem valor")}
          renderCard={(person) => (
            <button type="button" className="w-full text-left" onClick={() => openDetail(person)}>
              <PeopleCard person={person} />
            </button>
          )}
        />
      ) : state.view === "timeline" ? (
        <TimelineView
          items={rows}
          getDate={(row) => toDate(String((row as Record<string, unknown>)[state.timelineField] ?? ""))}
          renderTitle={(row) => resolvePersonDisplayNames(row.fullName, row.socialName).primary}
          renderBody={(row) => `${row.personType ?? "Sem tipo"} • ${row.status ?? "Sem status"}`}
          sortDirection={state.timelineSortDirection}
        />
      ) : state.view === "calendar" ? (
        <CalendarView
          items={rows}
          getDate={(row) => toDate(String((row as Record<string, unknown>)[state.calendarField] ?? ""))}
          renderItem={(row) => <PeopleCard person={row} />}
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
          <ListView<PeopleTableItem>
            data={rows}
            columns={columns as ColumnDef<PeopleTableItem, unknown>[]}
            getRowId={(row) => row.id}
            groupByFields={state.groupBy}
            resolveGroupLabel={resolveGroupLabel}
            onRowClick={openDetail}
            renderCard={(row) => <PeopleCard person={row} />}
            initialColumnPinning={{
              left: ["fullName"],
              right: ["status"],
            }}
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

