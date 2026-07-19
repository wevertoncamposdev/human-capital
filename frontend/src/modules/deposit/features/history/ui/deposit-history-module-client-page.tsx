"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpDown,
  BarChart3,
  CalendarDays,
  Clock3,
  Layers,
  PieChart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import {
  formatDateOnlyPtBR,
  parseLocalDateOnly,
} from "@/lib/date";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import type { ApiDepositHistoryMovement } from "@/modules/deposit/api";
import {
  depositHistoryModuleDefinition,
  type DepositHistoryQueryState,
} from "@/modules/deposit/config/deposit-module-contract";
import { DEPOSIT_ROUTES } from "@/modules/deposit/shared/domain/deposit.constants";
import type { SearchFacet } from "@/web-client/control-panel/SearchBar";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { createRestDataProvider } from "@/web-client/data-provider";
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
import {
  buildGraphViewModel,
  GraphBuilderControls,
  GraphView,
  parseGraphBuilderStateFromParams,
  serializeGraphBuilderStateToParams,
} from "@/web-client/views/GraphView";
import { KanbanView } from "@/web-client/views/KanbanView";
import { ListView } from "@/web-client/views/ListView";
import { TimelineView } from "@/web-client/views/TimelineView";

type HistoryRow = ApiDepositHistoryMovement & {
  itemName: string;
  itemGroup: string;
};

type DepositHistoryFavoriteState = Pick<
  DepositHistoryQueryState,
  | "view"
  | "searchText"
  | "domain"
  | "groupBy"
  | "pageSize"
  | "calendarField"
  | "calendarMode"
  | "calendarFrom"
  | "calendarTo"
  | "timelineField"
  | "timelineSortDirection"
  | "graph"
>;

const DEFAULT_CALENDAR_FIELD = "movementDate";
const DEFAULT_CALENDAR_MODE: DepositHistoryQueryState["calendarMode"] = "month";
const DEFAULT_TIMELINE_FIELD = "movementDate";
const DEFAULT_TIMELINE_SORT: DepositHistoryQueryState["timelineSortDirection"] = "desc";
const CALENDAR_MODE_LABELS: Record<DepositHistoryQueryState["calendarMode"], string> = {
  day: "Dia",
  week: "Semana",
  month: "Mes",
  year: "Ano",
};
const GRAPH_METRIC_LABELS = {
  count: "Contagem",
  sum: "Soma",
  avg: "Media",
  min: "Minimo",
  max: "Maximo",
  distinct_count: "Distintos",
} as const;
const GRAPH_CHART_LABELS = {
  area: "Area",
  bar: "Barras",
  bar_horizontal: "Barras horizontais",
  donut: "Rosca",
  line: "Linha",
  pie: "Pizza",
} as const;
const controlLineClassName =
  "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0";

const historyGraphBuilder = getModuleGraphBuilderConfig(depositHistoryModuleDefinition);

function normalizeView(value: string | null): DepositHistoryQueryState["view"] {
  switch (value) {
    case "kanban":
    case "timeline":
    case "calendar":
    case "graph":
    case "list":
      return value;
    case "table":
      return "list";
    default:
      return "list";
  }
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeIsoDateOnly(value: string | null) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeCalendarMode(
  value: string | null,
): DepositHistoryQueryState["calendarMode"] {
  switch (value) {
    case "day":
    case "week":
    case "month":
    case "year":
      return value;
    default:
      return DEFAULT_CALENDAR_MODE;
  }
}

const parseQueryState = (
  params: URLSearchParams,
): DepositHistoryQueryState => {
  const view = normalizeView(params.get("view") ?? params.get("v"));
  const searchText = params.get("q") ?? "";
  const domain = parseDomain(params.get("d")) ?? null;
  const groupParam = params.get("g");
  const groupBy =
    groupParam === "none"
      ? []
      : (groupParam ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
  const page = parsePositiveInt(params.get("page"), 1);
  const limit = parsePositiveInt(params.get("limit"), 50);

  return {
    view,
    searchText,
    domain,
    groupBy,
    pageIndex: page - 1,
    pageSize: Math.min(Math.max(limit, 1), 200),
    calendarField: params.get("cf") ?? DEFAULT_CALENDAR_FIELD,
    calendarMode: normalizeCalendarMode(params.get("cm")),
    calendarFrom: normalizeIsoDateOnly(params.get("cfrom")),
    calendarTo: normalizeIsoDateOnly(params.get("cto")),
    timelineField: params.get("tf") ?? DEFAULT_TIMELINE_FIELD,
    timelineSortDirection: params.get("tsd") === "asc" ? "asc" : DEFAULT_TIMELINE_SORT,
    graph: historyGraphBuilder
      ? parseGraphBuilderStateFromParams(params, historyGraphBuilder)
      : depositHistoryModuleDefinition.defaultQueryState.graph,
  };
};

const serializeQueryState = (state: DepositHistoryQueryState) => ({
  view: state.view === "list" ? undefined : state.view,
  q: state.searchText.trim() ? state.searchText.trim() : undefined,
  d: state.domain ? serializeDomain(state.domain) : undefined,
  g: state.groupBy.length ? state.groupBy.join(",") : undefined,
  page: state.pageIndex > 0 ? String(state.pageIndex + 1) : undefined,
  limit: state.pageSize === 50 ? undefined : String(state.pageSize),
  cf: state.calendarField !== DEFAULT_CALENDAR_FIELD ? state.calendarField : undefined,
  cm: state.calendarMode !== DEFAULT_CALENDAR_MODE ? state.calendarMode : undefined,
  cfrom: state.calendarFrom || undefined,
  cto: state.calendarTo || undefined,
  tf: state.timelineField !== DEFAULT_TIMELINE_FIELD ? state.timelineField : undefined,
  tsd: state.timelineSortDirection !== DEFAULT_TIMELINE_SORT ? state.timelineSortDirection : undefined,
  ...(historyGraphBuilder
    ? serializeGraphBuilderStateToParams(state.graph, historyGraphBuilder)
    : {}),
});

function resolveKindLabel(kind: ApiDepositHistoryMovement["kind"]) {
  return kind === "ENTRY" ? "Entrada" : "Saida";
}

function resolveExitTypeLabel(type?: string | null) {
  if (!type) return "";

  switch (type) {
    case "LOAN":
      return "Empr?stimo";
    case "FINAL_REMOVAL":
      return "Remocao final";
    case "TRANSFER":
      return "Transfer?ncia";
    case "ADJUSTMENT":
      return "Ajuste";
    case "LOSS":
      return "Perda";
    default:
      return type;
  }
}

function resolveGroupValue(row: ApiDepositHistoryMovement, field: string) {
  switch (field) {
    case "kind":
      return resolveKindLabel(row.kind);
    case "sector":
      return row.sector?.trim() || "Geral";
    case "type":
      return resolveExitTypeLabel(row.type);
    case "itemId":
      return row.item?.name?.trim() || "Item";
    case "itemGroup":
      return row.item?.group?.trim() || "Sem grupo";
    case "movementDate":
      return formatDateOnlyPtBR(row.movementDate);
    case "expiryDate":
      return row.expiryDate ? formatDateOnlyPtBR(row.expiryDate) : "Sem data limite";
    default:
      return String((row as Record<string, unknown>)[field] ?? "").trim() || "-";
  }
}

function resolveDate(row: ApiDepositHistoryMovement, field: string) {
  const raw = (row as Record<string, unknown>)[field];
  if (!raw) return null;
  return parseLocalDateOnly(String(raw));
}

export function DepositHistoryModuleClientPage() {
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const canRead = hasModulePermission(
    depositHistoryModuleDefinition,
    "canRead",
    permissions,
  );

  const dataProvider = React.useMemo(
    () => createRestDataProvider({ token }),
    [token],
  );

  const [rows, setRows] = React.useState<ApiDepositHistoryMovement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);

  const [state, setState] = useModuleQueryState<DepositHistoryQueryState>({
    moduleDefinition: depositHistoryModuleDefinition,
    trackedKeys: [
      "view",
      "v",
      "q",
      "d",
      "g",
      "page",
      "limit",
      "cf",
      "cm",
      "cfrom",
      "cto",
      "tf",
      "tsd",
      "gg",
      "gmf",
      "gmo",
      "gtf",
      "gtb",
      "gct",
      "gfi_itemId",
      "gfi_from",
      "gfi_to",
    ],
    parse: parseQueryState,
    serialize: serializeQueryState,
    equals: (left, right) =>
      JSON.stringify(serializeQueryState(left)) ===
      JSON.stringify(serializeQueryState(right)),
  });

  const shouldFetchAll =
    state.view === "calendar" ||
    state.view === "timeline" ||
    state.view === "graph";

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

  const openItem = React.useCallback(
    (row: ApiDepositHistoryMovement) => {
      router.push(withTenantPath(`${DEPOSIT_ROUTES.items}/${row.itemId}`, tenantSlug));
    },
    [router, tenantSlug],
  );

  const itemLabelById = React.useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      map.set(row.itemId, row.item?.name ?? row.itemId);
    });
    return map;
  }, [rows]);

  const viewRows = React.useMemo<HistoryRow[]>(
    () =>
      rows.map((row) => ({
        ...row,
        itemName: row.item?.name ?? "",
        itemGroup: row.item?.group ?? "",
      })),
    [rows],
  );

  const valueSuggestions = React.useMemo(() => {
    const sectors = new Set<string>();
    const donors = new Set<string>();
    const items = new Set<string>();
    const groups = new Set<string>();
    const actors = new Set<string>();
    const events = new Set<string>();

    rows.forEach((row) => {
      if (row.sector?.trim()) sectors.add(row.sector.trim());
      if (row.donorName?.trim()) donors.add(row.donorName.trim());
      if (row.item?.name?.trim()) items.add(row.item.name.trim());
      if (row.item?.group?.trim()) groups.add(row.item.group.trim());
      if (row.actor?.trim()) actors.add(row.actor.trim());
      if (row.destinationName?.trim()) events.add(row.destinationName.trim());
    });

    const sectorList = Array.from(sectors).sort((left, right) => left.localeCompare(right));
    const donorList = Array.from(donors).sort((left, right) => left.localeCompare(right));
    const itemList = Array.from(items).sort((left, right) => left.localeCompare(right));
    const groupList = Array.from(groups).sort((left, right) => left.localeCompare(right));
    const actorList = Array.from(actors).sort((left, right) => left.localeCompare(right));
    const eventList = Array.from(events).sort((left, right) => left.localeCompare(right));

    return (fieldName: string) => {
      if (fieldName === "sector") return sectorList;
      if (fieldName === "donorName") return donorList;
      if (fieldName === "itemName") return itemList;
      if (fieldName === "itemGroup") return groupList;
      if (fieldName === "actor") return actorList;
      if (fieldName === "destinationName") return eventList;
      return [];
    };
  }, [rows]);

  const loadRows = React.useCallback(async () => {
    if (!token || !canRead) return;
    setLoading(true);
    setError(null);

    try {
      const response = await dataProvider.search<ApiDepositHistoryMovement>(
        depositHistoryModuleDefinition.queryAdapters.listDataProvider.model,
        {
          searchText: debouncedSearch,
          domain: state.domain,
          all: shouldFetchAll ? true : undefined,
          pagination: shouldFetchAll
            ? undefined
            : { pageIndex: state.pageIndex, pageSize: state.pageSize },
        },
      );

      setRows(response.data);
      setPageCount(response.pagination?.pages ?? 1);
      setTotalCount(response.pagination?.total ?? response.data.length);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao carregar histórico.";

      setError(message);
      toast({
        variant: "destructive",
        title: "Falha ao carregar",
        description: message,
      });
      setRows([]);
      setPageCount(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    canRead,
    dataProvider,
    debouncedSearch,
    shouldFetchAll,
    state.domain,
    state.pageIndex,
    state.pageSize,
    toast,
    token,
  ]);

  React.useEffect(() => {
    void loadRows();
  }, [loadRows]);

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
        searchView: depositHistoryModuleDefinition.searchConfig,
        onClearGroupBy: () =>
          setState((previous) => ({ ...previous, groupBy: [] })),
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

  const columns = React.useMemo<ColumnDef<HistoryRow>[]>(
    () => [
      {
        id: "itemName",
        header: "Objeto",
        accessorFn: (row) => row.item?.name ?? "",
        cell: ({ row }) => (
          <div className="min-w-0 truncate font-medium text-foreground">
            {row.original.item?.name}
          </div>
        ),
      },
      {
        id: "itemGroup",
        header: "Grupo",
        accessorFn: (row) => row.item?.group ?? "",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.item?.group ?? "-"}
          </div>
        ),
      },
      {
        accessorKey: "kind",
        header: "Movimento",
        cell: ({ row }) => <div className="text-sm">{resolveKindLabel(row.original.kind)}</div>,
      },
      {
        accessorKey: "sector",
        header: "Setor",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.sector}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Tipo de saída",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.kind === "EXIT" && row.original.type
              ? resolveExitTypeLabel(row.original.type)
              : "-"}
          </div>
        ),
      },
      {
        accessorKey: "destinationName",
        header: "Destino",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.kind === "EXIT" ? row.original.destinationName ?? "-" : "-"}
          </div>
        ),
      },
      {
        accessorKey: "donorName",
        header: "Fonte",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.kind === "ENTRY" ? row.original.donorName ?? "-" : "-"}
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Qtd.",
        cell: ({ row }) => (
          <div className="font-mono tabular-nums">
            {Number(row.original.quantity).toLocaleString("pt-BR")}
          </div>
        ),
      },
      {
        accessorKey: "unit",
        header: "Un.",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">{row.original.unit}</div>
        ),
      },
      {
        accessorKey: "movementDate",
        header: "Data",
        cell: ({ row }) => formatDateOnlyPtBR(row.original.movementDate),
      },
      {
        accessorKey: "expiryDate",
        header: "Data limite",
        cell: ({ row }) =>
          row.original.expiryDate ? formatDateOnlyPtBR(row.original.expiryDate) : "-",
      },
      {
        accessorKey: "actor",
        header: "Usuário",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.actor ?? "-"}
          </div>
        ),
      },
      {
        accessorKey: "notes",
        header: "Notas",
        cell: ({ row }) => (
          <div className="max-w-[340px] truncate text-xs text-muted-foreground">
            {row.original.notes ?? ""}
          </div>
        ),
      },
    ],
    [],
  );

  const dateFields = React.useMemo(
    () =>
      depositHistoryModuleDefinition.searchConfig.fields.filter(
        (field) => field.type === "date",
      ),
    [],
  );

  const analysisSlot = React.useMemo(() => {
    if (state.view === "timeline") {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={state.timelineField}
            onValueChange={(value) =>
              setState((previous) => ({ ...previous, timelineField: value }))
            }
          >
            <SelectTrigger className={`${controlLineClassName} w-[11.5rem]`}>
              <SelectValue placeholder="Data..." />
            </SelectTrigger>
            <SelectContent>
              {dateFields.map((field) => (
                <SelectItem key={field.name} value={field.name}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={state.timelineSortDirection}
            onValueChange={(value) =>
              setState((previous) => ({
                ...previous,
                timelineSortDirection: value as DepositHistoryQueryState["timelineSortDirection"],
              }))
            }
          >
            <SelectTrigger className={`${controlLineClassName} w-[9rem]`}>
              <SelectValue placeholder="Ordem..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Mais recente</SelectItem>
              <SelectItem value="asc">Mais antiga</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (state.view === "calendar") {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={state.calendarField}
            onValueChange={(calendarField) =>
              setState((previous) => ({ ...previous, calendarField }))
            }
          >
            <SelectTrigger className={`${controlLineClassName} w-[11.5rem]`}>
              <SelectValue placeholder="Data..." />
            </SelectTrigger>
            <SelectContent>
              {dateFields.map((field) => (
                <SelectItem key={field.name} value={field.name}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={state.calendarMode}
            onValueChange={(calendarMode) =>
              setState((previous) => ({
                ...previous,
                calendarMode: calendarMode as DepositHistoryQueryState["calendarMode"],
              }))
            }
          >
            <SelectTrigger className={`${controlLineClassName} w-[8rem]`}>
              <SelectValue placeholder="Modo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={state.calendarFrom}
            onChange={(event) =>
              setState((previous) => ({
                ...previous,
                calendarFrom: normalizeIsoDateOnly(event.target.value),
              }))
            }
            className={`${controlLineClassName} w-[9rem]`}
          />
          <Input
            type="date"
            value={state.calendarTo}
            onChange={(event) =>
              setState((previous) => ({
                ...previous,
                calendarTo: normalizeIsoDateOnly(event.target.value),
              }))
            }
            className={`${controlLineClassName} w-[9rem]`}
          />
        </div>
      );
    }

    if (state.view === "graph") {
      return historyGraphBuilder ? (
        <GraphBuilderControls
          moduleDefinition={depositHistoryModuleDefinition}
          builder={historyGraphBuilder}
          state={state.graph}
          rows={viewRows as Array<Record<string, unknown>>}
          searchView={depositHistoryModuleDefinition.searchConfig}
          hideGroupBy
          layout="grid"
          controlClassName={controlLineClassName}
          onChange={(updater) =>
            setState((previous) => ({
              ...previous,
              graph: updater(previous.graph),
            }))
          }
        />
      ) : null;
    }

    return null;
  }, [
    dateFields,
    setState,
    state.calendarField,
    state.calendarFrom,
    state.calendarMode,
    state.calendarTo,
    state.graph,
    state.timelineField,
    state.timelineSortDirection,
    state.view,
    viewRows,
  ]);
  const analysisFacets = React.useMemo<SearchFacet[]>(() => {
    const facets: SearchFacet[] = [];
    const defaultState = depositHistoryModuleDefinition.defaultQueryState;

    if (state.view === "timeline") {
      const timelineLabel =
        dateFields.find((field) => field.name === state.timelineField)?.label ?? state.timelineField;
      facets.push({
        key: "analysis:timelineField",
        label: `Timeline: ${timelineLabel}`,
        tone: "analysis",
        analysisKind: "time",
        icon: <Clock3 className="size-3.5" />,
      });
      facets.push({
        key: "analysis:timelineSort",
        label: `Ordem: ${state.timelineSortDirection === "desc" ? "Mais recente" : "Mais antiga"}`,
        tone: "analysis",
        analysisKind: "sort",
        icon: <ArrowUpDown className="size-3.5" />,
      });
    }

    if (state.view === "calendar") {
      const calendarLabel =
        dateFields.find((field) => field.name === state.calendarField)?.label ?? state.calendarField;
      facets.push({
        key: "analysis:calendarField",
        label: `Calendário: ${calendarLabel}`,
        tone: "analysis",
        analysisKind: "time",
        icon: <CalendarDays className="size-3.5" />,
      });
      facets.push({
        key: "analysis:calendarMode",
        label: `Modo: ${CALENDAR_MODE_LABELS[state.calendarMode]}`,
        tone: "analysis",
        analysisKind: "time",
        icon: <CalendarDays className="size-3.5" />,
      });
      if (state.calendarFrom) {
        facets.push({
          key: "analysis:calendarFrom",
          label: `De: ${state.calendarFrom}`,
          tone: "analysis",
          analysisKind: "time",
          icon: <CalendarDays className="size-3.5" />,
          onRemove: () =>
            setState((previous) => ({
              ...previous,
              calendarFrom: defaultState.calendarFrom,
            })),
        });
      }
      if (state.calendarTo) {
        facets.push({
          key: "analysis:calendarTo",
          label: `Ate: ${state.calendarTo}`,
          tone: "analysis",
          analysisKind: "time",
          icon: <CalendarDays className="size-3.5" />,
          onRemove: () =>
            setState((previous) => ({
              ...previous,
              calendarTo: defaultState.calendarTo,
            })),
        });
      }
    }

    if (state.view === "graph" && historyGraphBuilder) {
      const groupField =
        historyGraphBuilder.fields.find((field) => field.field === state.graph.groupBy)?.label ??
        state.graph.groupBy;
      const metricField =
        state.graph.metric.field &&
        historyGraphBuilder.fields.find((field) => field.field === state.graph.metric.field)?.label;
      const metricLabel =
        state.graph.metric.op === "count"
          ? GRAPH_METRIC_LABELS.count
          : `${GRAPH_METRIC_LABELS[state.graph.metric.op]} ${metricField ?? ""}`.trim();

      facets.push({
        key: "analysis:graphGroup",
        label: `Agrupar: ${groupField}`,
        tone: "analysis",
        analysisKind: "group",
        icon: <Layers className="size-3.5" />,
      });
      facets.push({
        key: "analysis:graphMetric",
        label: metricLabel,
        tone: "analysis",
        analysisKind: "metric",
        icon: <BarChart3 className="size-3.5" />,
      });
      facets.push({
        key: "analysis:graphChart",
        label: `Gráfico: ${GRAPH_CHART_LABELS[state.graph.chartType] ?? state.graph.chartType}`,
        tone: "analysis",
        analysisKind: "chart",
        icon: <PieChart className="size-3.5" />,
      });

      if (state.graph.timeField) {
        const timeField =
          historyGraphBuilder.fields.find((field) => field.field === state.graph.timeField)?.label ??
          state.graph.timeField;
        facets.push({
          key: "analysis:graphTime",
          label: `Tempo: ${timeField} (${state.graph.timeBucket ?? "mes"})`,
          tone: "analysis",
          analysisKind: "time",
          icon: <CalendarDays className="size-3.5" />,
        });
      }
    }

    return facets;
  }, [
    dateFields,
    setState,
    state.calendarField,
    state.calendarFrom,
    state.calendarMode,
    state.calendarTo,
    state.graph,
    state.timelineField,
    state.timelineSortDirection,
    state.view,
  ]);
  const hasActiveAnalysis = React.useMemo(() => {
    const defaultState = depositHistoryModuleDefinition.defaultQueryState;

    if (state.groupBy.length) return true;
    if (state.view === "timeline") {
      return (
        state.timelineField !== defaultState.timelineField ||
        state.timelineSortDirection !== defaultState.timelineSortDirection
      );
    }
    if (state.view === "calendar") {
      return (
        state.calendarField !== defaultState.calendarField ||
        state.calendarMode !== defaultState.calendarMode ||
        Boolean(state.calendarFrom) ||
        Boolean(state.calendarTo)
      );
    }
    if (state.view === "graph") {
      return JSON.stringify(state.graph) !== JSON.stringify(defaultState.graph);
    }
    return false;
  }, [
    state.calendarField,
    state.calendarFrom,
    state.calendarMode,
    state.calendarTo,
    state.graph,
    state.groupBy,
    state.timelineField,
    state.timelineSortDirection,
    state.view,
  ]);
  const kanbanField = React.useMemo(() => {
    const selectedField = state.groupBy[0];
    if (selectedField) {
      return selectedField;
    }

    const kanbanView = depositHistoryModuleDefinition.views.find(
      (view) => view.id === "kanban" && view.viewType === "kanban",
    );

    if (kanbanView?.viewType === "kanban") {
      return (
        kanbanView.params?.defaultGroupByField ??
        kanbanView.params?.columnField ??
        "kind"
      );
    }

    return "kind";
  }, [state.groupBy]);

  const graphModel = React.useMemo(
    () =>
      historyGraphBuilder
        ? buildGraphViewModel(
            viewRows as Array<Record<string, unknown>>,
            state.graph,
            historyGraphBuilder,
          )
        : null,
    [state.graph, viewRows],
  );

  if (!canRead) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Você não tem permissão.
      </div>
    );
  }

  return (
    <EntityModuleShell<DepositHistoryQueryState, DepositHistoryFavoriteState>
      moduleDefinition={depositHistoryModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      analysisFacets={analysisFacets}
      valueSuggestions={valueSuggestions}
      favoriteSnapshot={{
        view: state.view,
        searchText: state.searchText,
        domain: state.domain,
        groupBy: state.groupBy,
        pageSize: state.pageSize,
        calendarField: state.calendarField,
        calendarMode: state.calendarMode,
        calendarFrom: state.calendarFrom,
        calendarTo: state.calendarTo,
        timelineField: state.timelineField,
        timelineSortDirection: state.timelineSortDirection,
        graph: state.graph,
      }}
      mapFavoriteToState={(snapshot) => snapshot}
      isLoading={loading}
      onRefresh={loadRows}
      totalCount={totalCount}
      analysisSlot={analysisSlot}
      allowEmptyGroupBy
      groupByMode="multi"
      hasActiveAnalysis={hasActiveAnalysis}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          calendarField: DEFAULT_CALENDAR_FIELD,
          calendarMode: DEFAULT_CALENDAR_MODE,
          calendarFrom: "",
          calendarTo: "",
          timelineField: DEFAULT_TIMELINE_FIELD,
          timelineSortDirection: DEFAULT_TIMELINE_SORT,
          graph: depositHistoryModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? (
        <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : rows.length ? (
        <>
          {state.view === "kanban" ? (
            <KanbanView<HistoryRow>
              items={viewRows}
              getColumnKey={(row) => resolveGroupValue(row, kanbanField)}
              renderCard={(row) => (
                <div
                  className="rounded-md border border-border/60 bg-background px-3 py-2 hover:bg-muted/20"
                  role="button"
                  tabIndex={0}
                  onClick={() => openItem(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      openItem(row);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {row.item?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {resolveKindLabel(row.kind)} • {row.sector || "Geral"}
                        {row.type ? ` • ${resolveExitTypeLabel(row.type)}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular-nums text-foreground">
                        {Number(row.quantity).toLocaleString("pt-BR")}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {row.unit}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {formatDateOnlyPtBR(row.movementDate)}
                    </Badge>
                    <Badge variant="secondary">{row.actor}</Badge>
                  </div>
                </div>
              )}
            />
          ) : state.view === "calendar" ? (
            <CalendarView<HistoryRow>
              items={viewRows}
              getDate={(row) => resolveDate(row, state.calendarField)}
              mode={state.calendarMode}
              onModeChange={(calendarMode) =>
                setState((previous) => ({ ...previous, calendarMode }))
              }
              dateFieldOptions={dateFields.map((field) => ({
                value: field.name,
                label: field.label,
              }))}
              activeDateField={state.calendarField}
              onActiveDateFieldChange={(calendarField) =>
                setState((previous) => ({ ...previous, calendarField }))
              }
              rangeFrom={state.calendarFrom}
              rangeTo={state.calendarTo}
              onRangeFromChange={(value) =>
                setState((previous) => ({
                  ...previous,
                  calendarFrom: normalizeIsoDateOnly(value),
                }))
              }
              onRangeToChange={(value) =>
                setState((previous) => ({
                  ...previous,
                  calendarTo: normalizeIsoDateOnly(value),
                }))
              }
              showModeSelect={false}
              showDateFieldSelect={false}
              showRangeInputs={false}
              emptyState="Nenhum movimento neste dia."
              renderItem={(row) => (
                <div
                  className="rounded-md border border-border/60 bg-background px-3 py-2 hover:bg-muted/20"
                  role="button"
                  tabIndex={0}
                  onClick={() => openItem(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      openItem(row);
                    }
                  }}
                >
                  <div className="truncate text-sm font-semibold text-foreground">
                    {row.item?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {resolveKindLabel(row.kind)} • {row.sector || "Geral"}
                  </div>
                </div>
              )}
            />
          ) : state.view === "timeline" ? (
            <TimelineView<HistoryRow>
              items={viewRows}
              getDate={(row) => resolveDate(row, state.timelineField)}
              sortDirection={state.timelineSortDirection}
              renderTitle={(row) => row.item?.name ?? "Movimento"}
              renderBody={(row) => (
                <span>
                  {resolveKindLabel(row.kind)} • {row.sector || "Geral"} •{" "}
                  {Number(row.quantity).toLocaleString("pt-BR")} {row.unit}
                </span>
              )}
            />
          ) : state.view === "graph" ? (
            graphModel ? (
              <GraphView
                data={graphModel.data}
                xKey={graphModel.xKey}
                series={graphModel.series}
                chartType={graphModel.chartType}
                className="mt-3"
                emptyState={graphModel.emptyState}
                downloadFileName={graphModel.downloadFileName}
              />
            ) : null
          ) : (
            <ListView<HistoryRow>
              data={viewRows}
              columns={columns}
              groupByFields={state.groupBy}
              resolveGroupLabel={(field, value) => {
                if (field === "kind") {
                  if (value === "ENTRY") return "Entrada";
                  if (value === "EXIT") return "Saida";
                  return "Movimento";
                }
                if (field === "sector") return String(value ?? "").trim() || "Geral";
                if (field === "type") return typeof value === "string" ? resolveExitTypeLabel(value) : "Sem tipo";
                if (field === "itemId") return itemLabelById.get(String(value ?? "")) ?? "Item";
                if (field === "itemGroup") return String(value ?? "").trim() || "Sem grupo";
                if (field === "destinationName") return String(value ?? "").trim() || "Sem destino";
                if (field === "donorName") return String(value ?? "").trim() || "Sem fonte";
                if (field === "quantity") {
                  const numberValue = typeof value === "number" ? value : Number(value);
                  return Number.isFinite(numberValue)
                    ? numberValue.toLocaleString("pt-BR")
                    : "Sem valor";
                }
                if (field === "unit") return String(value ?? "").trim() || "-";
                if (field === "movementDate") {
                  return String(value ?? "").trim()
                    ? formatDateOnlyPtBR(String(value))
                    : "Sem data";
                }
                if (field === "expiryDate") {
                  return String(value ?? "").trim()
                    ? formatDateOnlyPtBR(String(value))
                    : "Sem data limite";
                }
                if (field === "actor") return String(value ?? "").trim() || "Sistema";
                if (field === "notes") return String(value ?? "").trim() || "Sem notas";
                return String(value ?? "").trim() || "Sem valor";
              }}
              getRowId={(row) => row.id}
              onRowClick={openItem}
            />
          )}

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
      ) : (
        <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Nenhum resultado.
        </div>
      )}
    </EntityModuleShell>
  );
}


