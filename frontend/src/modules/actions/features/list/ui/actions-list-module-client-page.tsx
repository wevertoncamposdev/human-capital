"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  CalendarDays,
  Clock3,
  FolderKanban,
  Shapes,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { formatDateOnlyPtBR } from "@/lib/date";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  listActions,
  type ApiProjectAction,
  type ProjectActionsListResponse,
} from "@/modules/actions/api";
import {
  actionsListModuleDefinition,
  type ActionDateField,
  type ActionsListQueryState,
} from "@/modules/actions/config/actions-module-contract";
import { ACTION_STATUS_LABELS } from "@/modules/actions/shared/domain/actions.constants";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import { matchesDomainRecord } from "@/web-client/domain/evaluate";
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
import {
  buildGraphViewModel,
  GraphBuilderControls,
  GraphView,
  parseGraphBuilderStateFromParams,
  serializeGraphBuilderStateToParams,
} from "@/web-client/views/GraphView";
import { GanttView } from "@/web-client/views/GanttView";
import { KanbanView } from "@/web-client/views/KanbanView";
import { ListView } from "@/web-client/views/ListView";
import { TimelineView } from "@/web-client/views/TimelineView";

type ActionsFavoriteState = Pick<
  ActionsListQueryState,
  | "view"
  | "searchText"
  | "domain"
  | "groupBy"
  | "pageSize"
  | "timelineField"
  | "timelineSortDirection"
  | "calendarField"
  | "calendarMode"
  | "ganttScale"
  | "rangeFrom"
  | "rangeTo"
  | "graph"
>;

const actionsGraphBuilder = getModuleGraphBuilderConfig(actionsListModuleDefinition);
const analysisControlClassName =
  "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0";
const ACTION_CALENDAR_MODE_LABELS: Record<ActionsListQueryState["calendarMode"], string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  year: "Ano",
};
const ACTION_GANTT_SCALE_LABELS: Record<ActionsListQueryState["ganttScale"], string> = {
  week: "Semana",
  month: "Mês",
  quarter: "Trimestre",
};
const ACTION_LIST_GROUP_FIELD_KEYS: Record<string, string> = {
  status: "__group_status",
  "actionType.name": "__group_action_type_name",
  "project.name": "__group_project_name",
  "projectGroup.name": "__group_project_group_name",
  "peopleGroup.name": "__group_people_group_name",
  "peopleGroup.segment.name": "__group_people_group_name",
  "targetEnrollment.person.fullName": "__group_target_enrollment_name",
  tags: "__group_tags",
  createdAt: "__group_created_at",
};

function parseActionDate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseActionDateField(
  value: string | null,
  fallback: ActionDateField,
): ActionDateField {
  if (
    value === "plannedStartAt" ||
    value === "plannedEndAt" ||
    value === "executedStartAt" ||
    value === "executedEndAt"
  ) {
    return value;
  }
  return fallback;
}

function parseState(params: URLSearchParams): ActionsListQueryState {
  const calendarMode = params.get("calendarMode");
  return {
    ...actionsListModuleDefinition.defaultQueryState,
    view: (params.get("view") as ActionsListQueryState["view"]) ?? "table",
    searchText: params.get("q") ?? "",
    domain: parseDomain(params.get("d")) ?? null,
    groupBy: (params.get("g") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    pageIndex: parsePositiveInt(params.get("page"), 1) - 1,
    pageSize: Math.min(Math.max(parsePositiveInt(params.get("limit"), 20), 1), 100),
    timelineField: parseActionDateField(params.get("timelineField"), "plannedStartAt"),
    timelineSortDirection: params.get("timelineSort") === "asc" ? "asc" : "desc",
    calendarField: parseActionDateField(params.get("calendarField"), "plannedStartAt"),
    calendarMode:
      calendarMode === "day" ||
      calendarMode === "week" ||
      calendarMode === "year"
        ? (calendarMode as ActionsListQueryState["calendarMode"])
        : "month",
    ganttScale:
      params.get("ganttScale") === "week" || params.get("ganttScale") === "quarter"
        ? (params.get("ganttScale") as ActionsListQueryState["ganttScale"])
        : "month",
    rangeFrom: params.get("rangeFrom") ?? "",
    rangeTo: params.get("rangeTo") ?? "",
    graph: actionsGraphBuilder
      ? parseGraphBuilderStateFromParams(params, actionsGraphBuilder)
      : actionsListModuleDefinition.defaultQueryState.graph,
  };
}

function serializeState(state: ActionsListQueryState) {
  return {
    view: state.view === "table" ? undefined : state.view,
    q: state.searchText.trim() || undefined,
    d: state.domain ? serializeDomain(state.domain) : undefined,
    g: state.groupBy.length ? state.groupBy.join(",") : undefined,
    page: state.pageIndex > 0 ? String(state.pageIndex + 1) : undefined,
    limit: state.pageSize === 20 ? undefined : String(state.pageSize),
    timelineField: state.timelineField === "plannedStartAt" ? undefined : state.timelineField,
    timelineSort: state.timelineSortDirection === "desc" ? undefined : state.timelineSortDirection,
    calendarField: state.calendarField === "plannedStartAt" ? undefined : state.calendarField,
    calendarMode: state.calendarMode === "month" ? undefined : state.calendarMode,
    ganttScale: state.ganttScale === "month" ? undefined : state.ganttScale,
    rangeFrom: state.rangeFrom || undefined,
    rangeTo: state.rangeTo || undefined,
    ...(actionsGraphBuilder
      ? serializeGraphBuilderStateToParams(state.graph, actionsGraphBuilder)
      : {}),
  };
}

function resolveStatusBadge(status: ApiProjectAction["status"]) {
  const label = ACTION_STATUS_LABELS[status] ?? status;
  switch (status) {
    case "EXECUTED":
      return <Badge variant="secondary">{label}</Badge>;
    case "CANCELED":
      return <Badge variant="outline">{label}</Badge>;
    default:
      return <Badge className="border-transparent bg-blue-600 text-white">{label}</Badge>;
  }
}

function resolvePeopleGroupLabel(action: ApiProjectAction) {
  return action.peopleGroup?.name ?? "-";
}

function resolveActionTypeLabel(action: ApiProjectAction) {
  return action.actionType?.name ?? "Sem tipo";
}

function resolveRecordValue(record: ApiProjectAction, field: string): unknown {
  switch (field) {
    case "title":
      return record.title;
    case "tags":
      return record.tags ?? [];
    case "createdAt":
      return record.createdAt?.slice(0, 10) ?? null;
    case "status":
      return record.status;
    case "project.name":
      return record.project?.name ?? "";
    case "actionType.name":
      return resolveActionTypeLabel(record);
    case "projectGroup.name":
      return record.projectGroup?.name ?? "";
    case "peopleGroup.name":
    case "peopleGroup.segment.name":
      return resolvePeopleGroupLabel(record);
    case "targetEnrollment.person.fullName":
      return record.targetEnrollment?.person?.fullName ?? "";
    case "plannedStartAt":
      return record.plannedStartAt?.slice(0, 10) ?? null;
    case "plannedEndAt":
      return record.plannedEndAt?.slice(0, 10) ?? null;
    case "executedStartAt":
      return record.executedStartAt?.slice(0, 10) ?? null;
    case "executedEndAt":
      return record.executedEndAt?.slice(0, 10) ?? null;
    case "completionPercent":
      return record.completionPercent ?? 0;
    default:
      return (record as Record<string, unknown>)[field];
  }
}

function resolveGroupLabel(field: string, value: unknown) {
  if (field === "status" && typeof value === "string") {
    return ACTION_STATUS_LABELS[value as ApiProjectAction["status"]] ?? value;
  }
  if (
    (field === "createdAt" ||
      field === "plannedStartAt" ||
      field === "plannedEndAt" ||
      field === "executedStartAt" ||
      field === "executedEndAt") &&
    typeof value === "string" &&
    value
  ) {
    return formatDateOnlyPtBR(value);
  }
  return String(value ?? "Sem valor");
}

function actionColumns(): ColumnDef<ApiProjectAction>[] {
  return [
    {
      accessorKey: "title",
      header: "Ação",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium text-foreground">{row.original.title}</div>
          <div className="text-xs text-muted-foreground">{resolveActionTypeLabel(row.original)}</div>
        </div>
      ),
    },
    {
      id: "project",
      header: "Projeto",
      accessorFn: (row) => row.project?.name ?? "",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <FolderKanban className="size-4 text-muted-foreground" />
          <span>{row.original.project?.name ?? "-"}</span>
        </div>
      ),
    },
    {
      id: "peopleGroup",
      header: "Grupo de Pessoas",
      accessorFn: (row) => resolvePeopleGroupLabel(row),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Users className="size-4 text-muted-foreground" />
          <span>{resolvePeopleGroupLabel(row.original)}</span>
        </div>
      ),
    },
    {
      id: "projectGroup",
      header: "Grupo de Participantes",
      accessorFn: (row) => row.projectGroup?.name ?? "",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Shapes className="size-4 text-muted-foreground" />
          <span>{row.original.projectGroup?.name ?? "-"}</span>
        </div>
      ),
    },
    {
      id: "participant",
      header: "Participante",
      accessorFn: (row) => row.targetEnrollment?.person?.fullName ?? "",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">
          {row.original.targetEnrollment?.person?.fullName ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags ?? [];
        if (!tags.length) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={`${row.original.id}:${tag}`}
                variant="outline"
                className="rounded-full px-2 text-[10px]"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 ? (
              <Badge variant="outline" className="rounded-full px-2 text-[10px]">
                +{tags.length - 3}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "plannedStartAt",
      header: "Inicio",
      cell: ({ row }) => (
        <span className="text-foreground">
          {row.original.plannedStartAt
            ? formatDateOnlyPtBR(row.original.plannedStartAt.slice(0, 10))
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Cadastro",
      cell: ({ row }) => (
        <span className="text-foreground">
          {row.original.createdAt ? formatDateOnlyPtBR(row.original.createdAt.slice(0, 10)) : "-"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => resolveStatusBadge(row.original.status),
    },
  ];
}

function ActionCalendarCard({ action }: { action: ApiProjectAction }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <div className="truncate text-sm font-medium text-foreground">{action.title}</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {action.project?.name ?? "Sem projeto"}
      </div>
    </div>
  );
}

function actionDateGetter(field: ActionDateField) {
  return (action: ApiProjectAction) => parseActionDate(action[field]);
}

function resolveKanbanColumnValue(action: ApiProjectAction, field: string) {
  switch (field) {
    case "actionType.name":
      return resolveActionTypeLabel(action);
    case "project.name":
      return action.project?.name ?? "Sem projeto";
    case "projectGroup.name":
      return action.projectGroup?.name ?? "Sem grupo";
    case "peopleGroup.name":
    case "peopleGroup.segment.name":
      return resolvePeopleGroupLabel(action);
    case "targetEnrollment.person.fullName":
      return action.targetEnrollment?.person?.fullName ?? "Sem participante";
    case "tags":
      return action.tags?.[0] ?? "Sem tag";
    case "status":
    default:
      return ACTION_STATUS_LABELS[action.status] ?? action.status;
  }
}

function getActionGanttStart(action: ApiProjectAction) {
  return (
    parseActionDate(action.plannedStartAt) ??
    parseActionDate(action.executedStartAt) ??
    parseActionDate(action.plannedEndAt) ??
    parseActionDate(action.executedEndAt)
  );
}

function getActionGanttEnd(action: ApiProjectAction) {
  return (
    parseActionDate(action.plannedEndAt) ??
    parseActionDate(action.executedEndAt) ??
    parseActionDate(action.plannedStartAt) ??
    parseActionDate(action.executedStartAt)
  );
}

function resolveGanttGroupValue(action: ApiProjectAction, field: string) {
  switch (field) {
    case "actionType.name":
      return resolveActionTypeLabel(action);
    case "project.name":
      return action.project?.name ?? "Sem projeto";
    case "projectGroup.name":
      return action.projectGroup?.name ?? "Sem grupo";
    case "peopleGroup.name":
    case "peopleGroup.segment.name":
      return resolvePeopleGroupLabel(action);
    case "targetEnrollment.person.fullName":
      return action.targetEnrollment?.person?.fullName ?? "Sem participante";
    case "tags":
      return action.tags;
    case "createdAt":
      return action.createdAt?.slice(0, 10) ?? null;
    case "status":
    default:
      return ACTION_STATUS_LABELS[action.status] ?? action.status;
  }
}

async function fetchAllActions(token: string, searchText: string) {
  const limit = 200;
  const firstPage = await listActions(token, {
    q: searchText || undefined,
    page: 1,
    limit,
  });
  const allRows = [...(firstPage.data ?? [])];
  const totalPages = firstPage.pagination?.pages ?? 1;

  if (totalPages <= 1) {
    return allRows;
  }

  const requests: Promise<ProjectActionsListResponse>[] = [];
  for (let page = 2; page <= totalPages; page += 1) {
    requests.push(
      listActions(token, {
        q: searchText || undefined,
        page,
        limit,
      }),
    );
  }

  const pages = await Promise.all(requests);
  for (const page of pages) {
    allRows.push(...(page.data ?? []));
  }

  return allRows;
}

function resolveListGroupFieldKey(field: string) {
  return ACTION_LIST_GROUP_FIELD_KEYS[field] ?? field;
}

export function ActionsListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const columns = React.useMemo(() => actionColumns(), []);

  const canRead = hasModulePermission(actionsListModuleDefinition, "canRead", permissions);
  const canCreate = canUseModuleAction(actionsListModuleDefinition, "create", permissions);

  const [rows, setRows] = React.useState<ApiProjectAction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const [state, setState] = useModuleQueryState<ActionsListQueryState>({
    moduleDefinition: actionsListModuleDefinition,
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
      "ganttScale",
      "rangeFrom",
      "rangeTo",
      "gg",
      "gmf",
      "gmo",
      "gtf",
      "gtb",
      "gct",
    ],
    parse: parseState,
    serialize: serializeState,
    equals: (left, right) =>
      JSON.stringify(serializeState(left)) === JSON.stringify(serializeState(right)),
  });

  const loadRows = React.useCallback(async () => {
    if (authLoading || userLoading) return;
    if (!token || !canRead) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllActions(token, state.searchText.trim());
      setRows(result);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar ações.";
      setRows([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canRead, state.searchText, token, userLoading]);

  React.useEffect(() => {
    void loadRows();
  }, [loadRows, refreshKey]);

  const filteredRows = React.useMemo(() => {
    return rows.filter((record) => matchesDomainRecord(record, state.domain, resolveRecordValue));
  }, [rows, state.domain]);

  const listRows = React.useMemo(() => {
    return filteredRows.map((record) => ({
      ...record,
      [resolveListGroupFieldKey("status")]: record.status,
      [resolveListGroupFieldKey("actionType.name")]: resolveActionTypeLabel(record),
      [resolveListGroupFieldKey("project.name")]: record.project?.name ?? null,
      [resolveListGroupFieldKey("projectGroup.name")]: record.projectGroup?.name ?? null,
      [resolveListGroupFieldKey("peopleGroup.name")]: resolvePeopleGroupLabel(record),
      [resolveListGroupFieldKey("targetEnrollment.person.fullName")]:
        record.targetEnrollment?.person?.fullName ?? null,
      [resolveListGroupFieldKey("tags")]: record.tags ?? [],
      [resolveListGroupFieldKey("createdAt")]: record.createdAt?.slice(0, 10) ?? null,
    }));
  }, [filteredRows]);

  const listGroupByFields = React.useMemo(
    () => state.groupBy.map((field) => resolveListGroupFieldKey(field)),
    [state.groupBy],
  );

  const pagedRows = React.useMemo(() => {
    const start = state.pageIndex * state.pageSize;
    return listRows.slice(start, start + state.pageSize);
  }, [listRows, state.pageIndex, state.pageSize]);

  const pageCount = Math.max(Math.ceil(Math.max(listRows.length, 1) / state.pageSize), 1);

  const openDetail = React.useCallback(
    (action: ApiProjectAction) => {
      router.push(withTenantPath(`/actions/${action.id}?projectId=${action.projectId}`, tenantSlug));
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
        searchView: actionsListModuleDefinition.searchConfig,
        onClearGroupBy: () => setState((previous) => ({ ...previous, groupBy: [] })),
        onClearDomain: () =>
          setState((previous) => ({ ...previous, domain: null, pageIndex: 0 })),
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [removeDomainCondition, setState, state.domain, state.groupBy],
  );

  const favoriteSnapshot = React.useMemo<ActionsFavoriteState>(
    () => ({
      view: state.view,
      searchText: state.searchText,
      domain: state.domain,
      groupBy: state.groupBy,
      pageSize: state.pageSize,
      timelineField: state.timelineField,
      timelineSortDirection: state.timelineSortDirection,
      calendarField: state.calendarField,
      calendarMode: state.calendarMode,
      ganttScale: state.ganttScale,
      rangeFrom: state.rangeFrom,
      rangeTo: state.rangeTo,
      graph: state.graph,
    }),
    [
      state.calendarField,
      state.calendarMode,
      state.domain,
      state.ganttScale,
      state.graph,
      state.groupBy,
      state.pageSize,
      state.rangeFrom,
      state.rangeTo,
      state.searchText,
      state.timelineField,
      state.timelineSortDirection,
      state.view,
    ],
  );

  const graphModel = React.useMemo(
    () =>
      actionsGraphBuilder
        ? buildGraphViewModel(
            filteredRows as Array<Record<string, unknown>>,
            state.graph,
            actionsGraphBuilder,
          )
        : null,
    [filteredRows, state.graph],
  );

  const ganttGroupField = React.useMemo(() => {
    const selectedField = state.groupBy[0];
    if (selectedField) {
      return selectedField;
    }
    const ganttView = actionsListModuleDefinition.views.find(
      (view) => view.id === "gantt" && view.viewType === "gantt",
    );
    if (ganttView?.viewType === "gantt") {
      return ganttView.params?.defaultGroupByField ?? "status";
    }
    return "status";
  }, [state.groupBy]);

  const analysisSlot = React.useMemo(() => {
    if (state.view === "timeline") {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={state.timelineField}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                timelineField: next as ActionsListQueryState["timelineField"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[12rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plannedStartAt">Inicio planejado</SelectItem>
              <SelectItem value="plannedEndAt">Fim planejado</SelectItem>
              <SelectItem value="executedStartAt">Inicio executado</SelectItem>
              <SelectItem value="executedEndAt">Fim executado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state.timelineSortDirection}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                timelineSortDirection: next as ActionsListQueryState["timelineSortDirection"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[11rem]`}>
              <SelectValue />
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
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                calendarField: next as ActionsListQueryState["calendarField"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[12rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plannedStartAt">Inicio planejado</SelectItem>
              <SelectItem value="plannedEndAt">Fim planejado</SelectItem>
              <SelectItem value="executedStartAt">Inicio executado</SelectItem>
              <SelectItem value="executedEndAt">Fim executado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state.calendarMode}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                calendarMode: next as ActionsListQueryState["calendarMode"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[8rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Dia</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={state.rangeFrom}
            onChange={(event) =>
              setState((previous) => ({ ...previous, rangeFrom: event.target.value }))
            }
            className={`${analysisControlClassName} w-[9rem]`}
          />
          <Input
            type="date"
            value={state.rangeTo}
            onChange={(event) =>
              setState((previous) => ({ ...previous, rangeTo: event.target.value }))
            }
            className={`${analysisControlClassName} w-[9rem]`}
          />
        </div>
      );
    }

    if (state.view === "graph" && actionsGraphBuilder) {
      return (
        <GraphBuilderControls
          moduleDefinition={actionsListModuleDefinition}
          builder={actionsGraphBuilder}
          state={state.graph}
          rows={filteredRows as Array<Record<string, unknown>>}
          searchView={actionsListModuleDefinition.searchConfig}
          hideGroupBy
          layout="grid"
          controlClassName={analysisControlClassName}
          onChange={(updater) =>
            setState((previous) => ({
              ...previous,
              graph: updater(previous.graph),
            }))
          }
        />
      );
    }

    if (state.view === "gantt") {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={state.ganttScale}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                ganttScale: next as ActionsListQueryState["ganttScale"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[9rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    return undefined;
  }, [
    filteredRows,
    setState,
    state.calendarField,
    state.calendarMode,
    state.ganttScale,
    state.graph,
    state.rangeFrom,
    state.rangeTo,
    state.timelineField,
    state.timelineSortDirection,
    state.view,
  ]);

  const analysisFacets = React.useMemo(() => {
    const facets = [];
    const defaultState = actionsListModuleDefinition.defaultQueryState;

    if (state.view === "timeline") {
      facets.push({
        key: "analysis:timelineField",
        label: `Timeline: ${actionsListModuleDefinition.domainAdapter?.fields?.[state.timelineField]?.label ?? state.timelineField}`,
        tone: "analysis" as const,
        analysisKind: "time" as const,
        icon: <Clock3 className="size-3.5" />,
      });
      facets.push({
        key: "analysis:timelineSort",
        label: `Ordem: ${state.timelineSortDirection === "desc" ? "Mais recente" : "Mais antiga"}`,
        tone: "analysis" as const,
        analysisKind: "sort" as const,
        icon: <ArrowUpDown className="size-3.5" />,
        onRemove:
          state.timelineSortDirection !== defaultState.timelineSortDirection
            ? () =>
                setState((previous) => ({
                  ...previous,
                  timelineSortDirection: defaultState.timelineSortDirection,
                }))
            : undefined,
      });
    }

    if (state.view === "calendar") {
      facets.push({
        key: "analysis:calendarField",
        label: `Calendario: ${actionsListModuleDefinition.domainAdapter?.fields?.[state.calendarField]?.label ?? state.calendarField}`,
        tone: "analysis" as const,
        analysisKind: "time" as const,
        icon: <CalendarDays className="size-3.5" />,
      });
      facets.push({
        key: "analysis:calendarMode",
        label: `Modo: ${ACTION_CALENDAR_MODE_LABELS[state.calendarMode]}`,
        tone: "analysis" as const,
        analysisKind: "time" as const,
        icon: <CalendarDays className="size-3.5" />,
      });
    }

    if (state.view === "gantt") {
      facets.push({
        key: "analysis:ganttScale",
        label: `Escala: ${ACTION_GANTT_SCALE_LABELS[state.ganttScale]}`,
        tone: "analysis" as const,
        analysisKind: "time" as const,
        icon: <CalendarDays className="size-3.5" />,
      });
    }

    return facets;
  }, [
    setState,
    state.calendarField,
    state.calendarMode,
    state.ganttScale,
    state.timelineField,
    state.timelineSortDirection,
    state.view,
  ]);

  const hasActiveAnalysis = React.useMemo(() => {
    const defaultState = actionsListModuleDefinition.defaultQueryState;
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
        Boolean(state.rangeFrom) ||
        Boolean(state.rangeTo)
      );
    }
    if (state.view === "graph") {
      return JSON.stringify(state.graph) !== JSON.stringify(defaultState.graph);
    }
    if (state.view === "gantt") {
      return state.ganttScale !== defaultState.ganttScale;
    }
    return false;
  }, [
    state.calendarField,
    state.calendarMode,
    state.ganttScale,
    state.graph,
    state.groupBy,
    state.rangeFrom,
    state.rangeTo,
    state.timelineField,
    state.timelineSortDirection,
    state.view,
  ]);

  if (!authLoading && !userLoading && !canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Você não tem acesso a Ações.</div>;
  }

  return (
    <EntityModuleShell<ActionsListQueryState, ActionsFavoriteState>
      moduleDefinition={actionsListModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      analysisFacets={analysisFacets}
      favoriteSnapshot={favoriteSnapshot}
      mapFavoriteToState={(snapshot) => snapshot}
      isLoading={loading}
      totalCount={filteredRows.length}
      canCreate={canCreate}
      onCreate={() => router.push(withTenantPath("/actions/new", tenantSlug))}
      onRefresh={() => setRefreshKey((current) => current + 1)}
      analysisSlot={analysisSlot}
      hasActiveAnalysis={hasActiveAnalysis}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          timelineField: actionsListModuleDefinition.defaultQueryState.timelineField,
          timelineSortDirection:
            actionsListModuleDefinition.defaultQueryState.timelineSortDirection,
          calendarField: actionsListModuleDefinition.defaultQueryState.calendarField,
          calendarMode: actionsListModuleDefinition.defaultQueryState.calendarMode,
          ganttScale: actionsListModuleDefinition.defaultQueryState.ganttScale,
          rangeFrom: actionsListModuleDefinition.defaultQueryState.rangeFrom,
          rangeTo: actionsListModuleDefinition.defaultQueryState.rangeTo,
          graph: actionsListModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? <div className="px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {state.view === "kanban" ? (
        <KanbanView
          items={filteredRows}
          getColumnKey={(action) => resolveKanbanColumnValue(action, state.groupBy[0] ?? "status")}
          getColumnLabel={(value) => value}
          renderCard={(action) => (
            <button type="button" className="w-full text-left" onClick={() => openDetail(action)}>
              <ActionCalendarCard action={action} />
            </button>
          )}
        />
      ) : state.view === "timeline" ? (
        <TimelineView
          items={filteredRows}
          getDate={actionDateGetter(state.timelineField)}
          renderTitle={(action) => action.title}
          renderBody={(action) => (
            <div className="grid gap-1 text-[12px]">
              <div>{ACTION_STATUS_LABELS[action.status] ?? action.status}</div>
              <div>{action.project?.name ?? "Sem projeto"}</div>
            </div>
          )}
          sortDirection={state.timelineSortDirection}
        />
      ) : state.view === "calendar" ? (
        <CalendarView
          items={filteredRows}
          getDate={actionDateGetter(state.calendarField)}
          mode={state.calendarMode}
          onModeChange={(calendarMode) => setState((previous) => ({ ...previous, calendarMode }))}
          renderItem={(action) => (
            <button type="button" className="w-full text-left" onClick={() => openDetail(action)}>
              <ActionCalendarCard action={action} />
            </button>
          )}
          dateFieldOptions={[
            { value: "plannedStartAt", label: "Inicio planejado" },
            { value: "plannedEndAt", label: "Fim planejado" },
            { value: "executedStartAt", label: "Inicio executado" },
            { value: "executedEndAt", label: "Fim executado" },
          ]}
          activeDateField={state.calendarField}
          onActiveDateFieldChange={(next) =>
            setState((previous) => ({
              ...previous,
              calendarField: next as ActionsListQueryState["calendarField"],
            }))
          }
          rangeFrom={state.rangeFrom}
          rangeTo={state.rangeTo}
          onRangeFromChange={(value) => setState((previous) => ({ ...previous, rangeFrom: value }))}
          onRangeToChange={(value) => setState((previous) => ({ ...previous, rangeTo: value }))}
          showModeSelect={false}
          showDateFieldSelect={false}
          showRangeInputs={false}
        />
      ) : state.view === "gantt" ? (
        <GanttView
          items={filteredRows}
          getItemId={(action) => action.id}
          getItemLabel={(action) => action.title}
          getStartDate={getActionGanttStart}
          getEndDate={getActionGanttEnd}
          renderTitle={(action) => action.title}
          renderMeta={(action) => ACTION_STATUS_LABELS[action.status] ?? action.status}
          renderExternalLabel={(action) => action.project?.name ?? null}
          getGroupValue={(action) => resolveGanttGroupValue(action, ganttGroupField)}
          getGroupLabel={(value) => resolveGroupLabel(ganttGroupField, value)}
          onItemClick={openDetail}
          scale={state.ganttScale}
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
          <ListView<ApiProjectAction>
            data={pagedRows}
            columns={columns}
            groupByFields={listGroupByFields}
            resolveGroupLabel={(field, value) => {
              const originalField =
                Object.entries(ACTION_LIST_GROUP_FIELD_KEYS).find(([, key]) => key === field)?.[0] ??
                field;
              return resolveGroupLabel(originalField, value);
            }}
            onRowClick={openDetail}
            getRowId={(row) => row.id}
            initialColumnPinning={{ left: ["title"] }}
          />
          <PaginationBar
            pageIndex={state.pageIndex}
            pageSize={state.pageSize}
            pageCount={pageCount}
            onPageIndexChange={(pageIndex) => setState((previous) => ({ ...previous, pageIndex }))}
            onPageSizeChange={(pageSize) =>
              setState((previous) => ({ ...previous, pageIndex: 0, pageSize }))
            }
            disabled={loading}
          />
        </>
      )}
    </EntityModuleShell>
  );
}


