"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  BarChart3,
  CalendarDays,
  Clock3,
  Layers,
  PieChart,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  tasksListModuleDefinition,
  type TasksListQueryState,
  type TasksListViewId,
} from "@/modules/tasks/config/tasks-module-contract";
import type { TaskRecord } from "@/modules/tasks/shared/domain/types";
import { TaskCard } from "@/modules/tasks/shared/ui/task-card";
import type { SearchFacet } from "@/web-client/control-panel/SearchBar";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { createRestDataProvider } from "@/web-client/data-provider";
import {
  updateTaskRecordRemote,
  updateTaskSubtaskRemote,
} from "@/web-client/data-provider/rest/tasks";
import {
  collectAndConditions,
  domainFromConditions,
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

type TasksFavoriteState = Pick<
  TasksListQueryState,
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

const tasksGraphBuilder = getModuleGraphBuilderConfig(tasksListModuleDefinition);
const analysisControlClassName =
  "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0";
const TASK_CALENDAR_MODE_LABELS: Record<TasksListQueryState["calendarMode"], string> = {
  day: "Dia",
  week: "Semana",
  month: "Mes",
  year: "Ano",
};
const TASK_GANTT_SCALE_LABELS: Record<TasksListQueryState["ganttScale"], string> = {
  week: "Semana",
  month: "Mes",
  quarter: "Trimestre",
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
const TAG_FILTER_FIELD = "tags";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseTasksListState(params: URLSearchParams): TasksListQueryState {
  const groupParam = params.get("g");
  const view = (params.get("view") ?? "list") as TasksListViewId;
  const calendarMode = params.get("calendarMode");

  return {
    view,
    searchText: params.get("q") ?? "",
    domain: parseDomain(params.get("d")) ?? null,
    groupBy: (groupParam ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    pageIndex: parsePositiveInt(params.get("page"), 1) - 1,
    pageSize: Math.min(Math.max(parsePositiveInt(params.get("limit"), 12), 1), 100),
    timelineField: params.get("timelineField") === "startDate" ? "startDate" : "dueDate",
    timelineSortDirection: params.get("timelineSort") === "asc" ? "asc" : "desc",
    calendarField: params.get("calendarField") === "startDate" ? "startDate" : "dueDate",
    calendarMode:
      calendarMode === "day" ||
      calendarMode === "week" ||
      calendarMode === "year"
        ? (calendarMode as TasksListQueryState["calendarMode"])
        : "month",
    ganttScale:
      params.get("ganttScale") === "week" || params.get("ganttScale") === "quarter"
        ? (params.get("ganttScale") as TasksListQueryState["ganttScale"])
        : "month",
    rangeFrom: params.get("rangeFrom") ?? "",
    rangeTo: params.get("rangeTo") ?? "",
    graph: tasksGraphBuilder
      ? parseGraphBuilderStateFromParams(params, tasksGraphBuilder)
      : tasksListModuleDefinition.defaultQueryState.graph,
  };
}

function serializeTasksListState(state: TasksListQueryState) {
  return {
    view: state.view === "list" ? undefined : state.view,
    q: state.searchText.trim() ? state.searchText.trim() : undefined,
    d: state.domain ? serializeDomain(state.domain) : undefined,
    g: state.groupBy.length ? state.groupBy.join(",") : undefined,
    page: state.pageIndex > 0 ? String(state.pageIndex + 1) : undefined,
    limit: state.pageSize === 12 ? undefined : String(state.pageSize),
    timelineField: state.timelineField === "dueDate" ? undefined : state.timelineField,
    timelineSort: state.timelineSortDirection === "desc" ? undefined : state.timelineSortDirection,
    calendarField: state.calendarField === "dueDate" ? undefined : state.calendarField,
    calendarMode: state.calendarMode === "month" ? undefined : state.calendarMode,
    ganttScale: state.ganttScale === "month" ? undefined : state.ganttScale,
    rangeFrom: state.rangeFrom || undefined,
    rangeTo: state.rangeTo || undefined,
    ...(tasksGraphBuilder ? serializeGraphBuilderStateToParams(state.graph, tasksGraphBuilder) : {}),
  };
}

function resolveGroupLabel(_field: string, value: unknown) {
  return String(value ?? "Sem valor");
}

function resolveKanbanColumnValue(task: TaskRecord, field: string) {
  switch (field) {
    case "priority":
      return task.priority;
    case "kind":
      return task.kind;
    case "owner":
      return task.owner ?? "Sem responsavel";
    case "team":
      return task.team ?? "Sem time";
    case "dueState":
      return task.dueState;
    case "status":
    default:
      return task.status;
  }
}

function taskDateGetter(field: "dueDate" | "startDate") {
  return (task: TaskRecord) => {
    const value = field === "startDate" ? task.startDate : task.dueDate;
    return value ? new Date(`${value}T00:00:00`) : null;
  };
}

function formatTaskDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function TaskCalendarItem({ task }: { task: TaskRecord }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <div className="truncate text-sm font-medium text-foreground">{task.title}</div>
      <div className="mt-3 grid gap-1.5 text-[12px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Status</span>
          <span className="text-foreground">{task.status}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Responsavel</span>
          <span className="truncate text-foreground">{task.owner ?? "-"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Entrega</span>
          <span className="text-foreground">{task.dueDate ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}

export function TasksListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const canRead = hasModulePermission(
    tasksListModuleDefinition,
    "canRead",
    permissions,
  );
  const canCreate = canUseModuleAction(
    tasksListModuleDefinition,
    "create",
    permissions,
  );
  const canEdit = permissions.includes("tasks.update");

  const [rows, setRows] = React.useState<TaskRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [state, setState] = useModuleQueryState<TasksListQueryState>({
    moduleDefinition: tasksListModuleDefinition,
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
    parse: parseTasksListState,
    serialize: serializeTasksListState,
    equals: (left, right) =>
      JSON.stringify(serializeTasksListState(left)) ===
      JSON.stringify(serializeTasksListState(right)),
  });

  const columns = React.useMemo<ColumnDef<TaskRecord, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Tarefa",
        cell: ({ row }) => (
          <div className="min-w-0 truncate text-[13px] font-medium text-foreground">
            {row.original.title}
          </div>
        ),
      },
      {
        accessorKey: "kind",
        header: "Tipo",
        cell: ({ row }) => row.original.kind,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => row.original.status,
      },
      {
        accessorKey: "priority",
        header: "Prioridade",
        cell: ({ row }) => row.original.priority,
      },
      {
        accessorKey: "dueState",
        header: "Prazo",
        cell: ({ row }) => row.original.dueState,
      },
      {
        accessorKey: "owner",
        header: "Responsavel",
        cell: ({ row }) => row.original.owner ?? "-",
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) =>
          row.original.tags.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {row.original.tags.length > 3 ? (
                <span className="text-[11px] text-muted-foreground">
                  +{row.original.tags.length - 3}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "dueDate",
        header: "Entrega",
        cell: ({ row }) => row.original.dueDate ?? "-",
      },
      {
        accessorKey: "progress",
        header: "Progresso",
        cell: ({ row }) => `${row.original.progress}%`,
      },
    ],
    [],
  );

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
      const response = await dataProvider.search<TaskRecord>(
        tasksListModuleDefinition.queryAdapters.listDataProvider.model,
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
          : "Falha ao carregar tarefas.";
      setRows([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    authLoading,
    canRead,
    dataProvider,
    state.domain,
    state.groupBy,
    state.searchText,
    token,
    userLoading,
  ]);

  React.useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const totalCount = rows.length;
  const pageCount = Math.max(Math.ceil(Math.max(totalCount, 1) / state.pageSize), 1);
  const pageStart = state.pageIndex * state.pageSize;
  const pagedRows = rows.slice(pageStart, pageStart + state.pageSize);

  const openCreate = React.useCallback(() => {
    router.push(withTenantPath("/tasks/new", tenantSlug));
  }, [router, tenantSlug]);

  const openDetail = React.useCallback(
    (task: TaskRecord) => {
      router.push(withTenantPath(`/tasks/${task.id}`, tenantSlug));
    },
    [router, tenantSlug],
  );
  const getTaskGanttStart = React.useCallback(
    (task: TaskRecord) =>
      task.startDate
        ? new Date(`${task.startDate}T00:00:00`)
        : task.dueDate
          ? new Date(`${task.dueDate}T00:00:00`)
          : null,
    [],
  );
  const getTaskGanttEnd = React.useCallback(
    (task: TaskRecord) =>
      task.dueDate
        ? new Date(`${task.dueDate}T00:00:00`)
        : task.startDate
          ? new Date(`${task.startDate}T00:00:00`)
          : null,
    [],
  );
  const getTaskGanttDependencyIds = React.useCallback(
    (task: TaskRecord) => task.dependencies.map((entry) => entry.taskId),
    [],
  );
  const getTaskIsMilestone = React.useCallback(
    (task: TaskRecord) => task.isMilestone,
    [],
  );
  const handleGanttWindowChange = React.useCallback(
    async (task: TaskRecord, nextWindow: { start: Date; end: Date }) => {
      if (!token || !canEdit) {
        return;
      }

      try {
        const updated = await updateTaskRecordRemote(token, task.id, {
          startDate: formatTaskDateOnly(nextWindow.start),
          dueDate: formatTaskDateOnly(nextWindow.end),
        });

        setRows((previous) =>
          previous.map((row) => (row.id === updated.id ? updated : row)),
        );
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao atualizar o cronograma da tarefa.";
        toast({
          variant: "destructive",
          title: "Falha ao atualizar prazo",
          description: message,
        });
        throw error;
      }
    },
    [canEdit, toast, token],
  );
  const handleGanttSubtaskWindowChange = React.useCallback(
    async (
      subtask: TaskRecord["subtasks"][number],
      task: TaskRecord,
      nextWindow: { start: Date; end: Date },
    ) => {
      if (!token || !canEdit) {
        return;
      }

      try {
        const updated = await updateTaskSubtaskRemote(token, task.id, subtask.id, {
          startDate: formatTaskDateOnly(nextWindow.start),
          dueDate: formatTaskDateOnly(nextWindow.end),
        });

        setRows((previous) =>
          previous.map((row) => (row.id === updated.id ? updated : row)),
        );
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao atualizar o prazo da subtarefa.";
        toast({
          variant: "destructive",
          title: "Falha ao atualizar subtarefa",
          description: message,
        });
        throw error;
      }
    },
    [canEdit, toast, token],
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
        searchView: tasksListModuleDefinition.searchConfig,
        onClearGroupBy: () => setState((previous) => ({ ...previous, groupBy: [] })),
        onClearDomain: () =>
          setState((previous) => ({ ...previous, domain: null, pageIndex: 0 })),
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [removeDomainCondition, setState, state.domain, state.groupBy],
  );

  const valueSuggestions = React.useMemo(() => {
    const owners = Array.from(
      new Set(rows.map((row) => row.owner?.trim()).filter(Boolean)),
    ) as string[];
    const teams = Array.from(
      new Set(rows.map((row) => row.team?.trim()).filter(Boolean)),
    ) as string[];
    const nextTags = Array.from(
      new Set(rows.flatMap((row) => row.tags.map((tag) => tag.trim()).filter(Boolean))),
    );

    owners.sort((left, right) => left.localeCompare(right));
    teams.sort((left, right) => left.localeCompare(right));
    nextTags.sort((left, right) => left.localeCompare(right));

    return (fieldName: string) => {
      if (fieldName === "owner") return owners;
      if (fieldName === "team") return teams;
      if (fieldName === "tags") return nextTags;
      return [];
    };
  }, [rows]);

  const tagOptions = React.useMemo(() => valueSuggestions("tags"), [valueSuggestions]);
  const selectedTag = React.useMemo(() => {
    const conditions = collectAndConditions(state.domain);
    const tagCondition = conditions?.find(
      (condition) =>
        condition.field === TAG_FILTER_FIELD &&
        (condition.operator === "contains" || condition.operator === "="),
    );
    return typeof tagCondition?.value === "string" ? tagCondition.value : "__all__";
  }, [state.domain]);

  const handleTagFilterChange = React.useCallback(
    (value: string) => {
      setState((previous) => {
        const conditions = collectAndConditions(previous.domain) ?? [];
        const nextConditions = conditions.filter((condition) => condition.field !== TAG_FILTER_FIELD);

        if (value !== "__all__") {
          nextConditions.push({
            type: "condition",
            field: TAG_FILTER_FIELD,
            operator: "contains",
            value,
          });
        }

        return {
          ...previous,
          domain: domainFromConditions("and", nextConditions),
          pageIndex: 0,
        };
      });
    },
    [setState],
  );

  const graphModel = React.useMemo(
    () =>
      tasksGraphBuilder
        ? buildGraphViewModel(rows as Array<Record<string, unknown>>, state.graph, tasksGraphBuilder)
        : null,
    [rows, state.graph],
  );

  const kanbanField = React.useMemo(() => {
    const selectedField = state.groupBy[0];
    if (selectedField) {
      return selectedField;
    }

    const kanbanView = tasksListModuleDefinition.views.find(
      (view) => view.id === "kanban" && view.viewType === "kanban",
    );

    if (kanbanView?.viewType === "kanban") {
      return kanbanView.params?.defaultGroupByField ?? kanbanView.params?.columnField ?? "status";
    }

    return "status";
  }, [state.groupBy]);
  const ganttView = React.useMemo(
    () =>
      tasksListModuleDefinition.views.find(
        (view) => view.id === "gantt" && view.viewType === "gantt",
      ),
    [],
  );
  const ganttGroupField = React.useMemo(() => {
    const selectedField = state.groupBy[0];
    if (selectedField) {
      return selectedField;
    }

    return ganttView?.viewType === "gantt"
      ? ganttView.params?.defaultGroupByField ?? "status"
      : "status";
  }, [ganttView, state.groupBy]);

  const analysisSlot = React.useMemo(() => {
    if (state.view === "timeline") {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={state.timelineField}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                timelineField: next as TasksListQueryState["timelineField"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[11rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Usar entrega</SelectItem>
              <SelectItem value="startDate">Usar inicio</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state.timelineSortDirection}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                timelineSortDirection: next as TasksListQueryState["timelineSortDirection"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[9rem]`}>
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
                calendarField: next as TasksListQueryState["calendarField"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[11rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Usar entrega</SelectItem>
              <SelectItem value="startDate">Usar inicio</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state.calendarMode}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                calendarMode: next as TasksListQueryState["calendarMode"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[8rem]`}>
              <SelectValue />
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

    if (state.view === "graph") {
      return tasksGraphBuilder ? (
        <GraphBuilderControls
          moduleDefinition={tasksListModuleDefinition}
          builder={tasksGraphBuilder}
          state={state.graph}
          rows={rows as Array<Record<string, unknown>>}
          searchView={tasksListModuleDefinition.searchConfig}
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
      ) : undefined;
    }

    if (state.view === "gantt") {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={state.ganttScale}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                ganttScale: next as TasksListQueryState["ganttScale"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[9rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    return undefined;
  }, [
    rows,
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
  const analysisFacets = React.useMemo<SearchFacet[]>(() => {
    const facets: SearchFacet[] = [];
    const defaultState = tasksListModuleDefinition.defaultQueryState;

    if (state.view === "timeline") {
      facets.push({
        key: "analysis:timelineField",
        label: `Timeline: ${state.timelineField === "dueDate" ? "Entrega" : "Inicio"}`,
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
        label: `Calendario: ${state.calendarField === "dueDate" ? "Entrega" : "Inicio"}`,
        tone: "analysis",
        analysisKind: "time",
        icon: <CalendarDays className="size-3.5" />,
      });
      facets.push({
        key: "analysis:calendarMode",
        label: `Modo: ${TASK_CALENDAR_MODE_LABELS[state.calendarMode]}`,
        tone: "analysis",
        analysisKind: "time",
        icon: <CalendarDays className="size-3.5" />,
      });

      if (state.rangeFrom) {
        facets.push({
          key: "analysis:rangeFrom",
          label: `De: ${state.rangeFrom}`,
          tone: "analysis",
          analysisKind: "time",
          icon: <CalendarDays className="size-3.5" />,
          onRemove: () =>
            setState((previous) => ({ ...previous, rangeFrom: defaultState.rangeFrom })),
        });
      }

      if (state.rangeTo) {
        facets.push({
          key: "analysis:rangeTo",
          label: `Ate: ${state.rangeTo}`,
          tone: "analysis",
          analysisKind: "time",
          icon: <CalendarDays className="size-3.5" />,
          onRemove: () =>
            setState((previous) => ({ ...previous, rangeTo: defaultState.rangeTo })),
        });
      }
    }

    if (state.view === "graph" && tasksGraphBuilder) {
      const groupField =
        tasksGraphBuilder.fields.find((field) => field.field === state.graph.groupBy)?.label ??
        state.graph.groupBy;
      const metricField =
        state.graph.metric.field &&
        tasksGraphBuilder.fields.find((field) => field.field === state.graph.metric.field)?.label;
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
        label: `Grafico: ${GRAPH_CHART_LABELS[state.graph.chartType] ?? state.graph.chartType}`,
        tone: "analysis",
        analysisKind: "chart",
        icon: <PieChart className="size-3.5" />,
      });

      if (state.graph.timeField) {
        const timeField =
          tasksGraphBuilder.fields.find((field) => field.field === state.graph.timeField)?.label ??
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

    if (state.view === "gantt") {
      facets.push({
        key: "analysis:ganttScale",
        label: `Escala: ${TASK_GANTT_SCALE_LABELS[state.ganttScale]}`,
        tone: "analysis",
        analysisKind: "time",
        icon: <CalendarDays className="size-3.5" />,
      });
    }

    return facets;
  }, [
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
  const hasActiveAnalysis = React.useMemo(() => {
    const defaultState = tasksListModuleDefinition.defaultQueryState;

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
      return (
        JSON.stringify(state.graph) !== JSON.stringify(defaultState.graph)
      );
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

  if (authLoading || userLoading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando tarefas...</div>;
  }

  if (!canRead) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Voce nao tem permissao para acessar esta area.
      </div>
    );
  }

  return (
    <EntityModuleShell<TasksListQueryState, TasksFavoriteState>
      moduleDefinition={tasksListModuleDefinition}
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
        timelineField: state.timelineField,
        timelineSortDirection: state.timelineSortDirection,
        calendarField: state.calendarField,
        calendarMode: state.calendarMode,
        ganttScale: state.ganttScale,
        rangeFrom: state.rangeFrom,
        rangeTo: state.rangeTo,
        graph: state.graph,
      }}
      mapFavoriteToState={(snapshot) => snapshot}
      isLoading={loading}
      onRefresh={loadRows}
      totalCount={totalCount}
      onCreate={openCreate}
      canCreate={canCreate}
      rightSlot={
        <Select value={selectedTag} onValueChange={handleTagFilterChange}>
          <SelectTrigger className="h-8 min-w-[10rem] rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tag</SelectItem>
            {selectedTag !== "__all__" && !tagOptions.includes(selectedTag) ? (
              <SelectItem value={selectedTag}>{selectedTag}</SelectItem>
            ) : null}
            {tagOptions.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      analysisSlot={analysisSlot}
      hasActiveAnalysis={hasActiveAnalysis}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          timelineField: tasksListModuleDefinition.defaultQueryState.timelineField,
          timelineSortDirection: tasksListModuleDefinition.defaultQueryState.timelineSortDirection,
          calendarField: tasksListModuleDefinition.defaultQueryState.calendarField,
          calendarMode: tasksListModuleDefinition.defaultQueryState.calendarMode,
          ganttScale: tasksListModuleDefinition.defaultQueryState.ganttScale,
          rangeFrom: tasksListModuleDefinition.defaultQueryState.rangeFrom,
          rangeTo: tasksListModuleDefinition.defaultQueryState.rangeTo,
          graph: tasksListModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? (
        <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Carregando tarefas...
        </div>
      ) : state.view === "kanban" ? (
        <KanbanView
          items={rows}
          getColumnKey={(task) => resolveKanbanColumnValue(task, kanbanField)}
          getColumnLabel={(value) => value}
          renderCard={(task) => (
            <button type="button" className="text-left" onClick={() => openDetail(task)}>
              <TaskCard task={task} />
            </button>
          )}
        />
      ) : state.view === "timeline" ? (
        <TimelineView
          items={rows}
          getDate={taskDateGetter(state.timelineField)}
          renderTitle={(task) => task.title}
          renderBody={(task) => (
            <div className="grid gap-1 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="text-foreground">{task.status}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Responsavel</span>
                <span className="truncate text-foreground">{task.owner ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Entrega</span>
                <span className="text-foreground">{task.dueDate ?? "-"}</span>
              </div>
            </div>
          )}
          sortDirection={state.timelineSortDirection}
        />
      ) : state.view === "calendar" ? (
        <CalendarView
          items={rows}
          getDate={taskDateGetter(state.calendarField)}
          mode={state.calendarMode}
          onModeChange={(calendarMode) =>
            setState((previous) => ({ ...previous, calendarMode }))
          }
          renderItem={(task) => (
            <button type="button" className="w-full text-left" onClick={() => openDetail(task)}>
              <TaskCalendarItem task={task} />
            </button>
          )}
          dateFieldOptions={[
            { value: "dueDate", label: "Entrega" },
            { value: "startDate", label: "Inicio" },
          ]}
          activeDateField={state.calendarField}
          onActiveDateFieldChange={(next) =>
            setState((previous) => ({
              ...previous,
              calendarField: next as TasksListQueryState["calendarField"],
            }))
          }
          rangeFrom={state.rangeFrom}
          rangeTo={state.rangeTo}
          onRangeFromChange={(value) =>
            setState((previous) => ({ ...previous, rangeFrom: value }))
          }
          onRangeToChange={(value) =>
            setState((previous) => ({ ...previous, rangeTo: value }))
          }
          showModeSelect={false}
          showDateFieldSelect={false}
          showRangeInputs={false}
        />
      ) : state.view === "gantt" ? (
        <GanttView
          items={rows}
          getItemId={(task) => task.id}
          getItemLabel={(task) => task.title}
          getStartDate={getTaskGanttStart}
          getEndDate={getTaskGanttEnd}
          renderTitle={(task) => task.title}
          renderMeta={(task) => task.owner ?? task.status}
          getProgress={(task) => task.progress}
          renderExternalLabel={(task) => task.summary?.trim() || null}
          getDependencyIds={getTaskGanttDependencyIds}
          getIsMilestone={getTaskIsMilestone}
          getChildren={(task) => task.subtasks}
          getChildId={(subtask) => subtask.id}
          getChildLabel={(subtask) => subtask.title}
          getChildStartDate={(subtask) =>
            subtask.startDate
              ? new Date(`${subtask.startDate}T00:00:00`)
              : subtask.dueDate
                ? new Date(`${subtask.dueDate}T00:00:00`)
                : null
          }
          getChildEndDate={(subtask) =>
            subtask.dueDate
              ? new Date(`${subtask.dueDate}T00:00:00`)
              : subtask.startDate
                ? new Date(`${subtask.startDate}T00:00:00`)
                : null
          }
          renderChildTitle={(subtask) => subtask.title}
          renderChildMeta={(subtask) => subtask.owner ?? subtask.status}
          renderChildExternalLabel={(subtask) =>
            subtask.description?.trim() || subtask.title
          }
          getChildProgress={(subtask) =>
            subtask.status === "Concluida"
              ? 100
              : subtask.status === "Em andamento"
                ? 50
                : 0
          }
          getChildIsMilestone={(subtask) => {
            const startDate = subtask.startDate ?? subtask.dueDate;
            const dueDate = subtask.dueDate ?? subtask.startDate;
            return Boolean(startDate && dueDate && startDate === dueDate);
          }}
          getChildConstraintWindow={(_, task) => ({
            start: task.startDate ? new Date(`${task.startDate}T00:00:00`) : null,
            end: task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : null,
          })}
          getGroupValue={(task) => {
            switch (ganttGroupField) {
              case "priority":
                return task.priority;
              case "kind":
                return task.kind;
              case "owner":
                return task.owner ?? "Sem responsavel";
              case "team":
                return task.team ?? "Sem time";
              case "dueState":
                return task.dueState;
              case "tags":
                return task.tags;
              case "status":
              default:
                return task.status;
            }
          }}
          getGroupLabel={(value) => String(value ?? "Sem valor")}
          onItemClick={openDetail}
          onChildClick={(_, task) => openDetail(task)}
          onItemDateRangeChange={canEdit ? handleGanttWindowChange : undefined}
          onChildDateRangeChange={canEdit ? handleGanttSubtaskWindowChange : undefined}
          scale={state.ganttScale}
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
          <ListView<TaskRecord>
            data={pagedRows}
            columns={columns}
            getRowId={(row) => row.id}
            groupByFields={state.groupBy}
            resolveGroupLabel={resolveGroupLabel}
            onRowClick={openDetail}
            initialColumnPinning={{ left: ["title"], right: ["progress"] }}
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
