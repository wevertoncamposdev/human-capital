"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, CalendarDays, Clock3, Layers } from "lucide-react";
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
import { usePathname, useRouter } from "next/navigation";
import type { ApiProject } from "@/modules/projects/api";
import {
  projectsListModuleDefinition,
  type ProjectsListQueryState,
} from "@/modules/projects/config/projects-module-contract";
import { PROJECT_STATUS_LABELS } from "@/modules/projects/shared/domain/projects.constants";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { createRestDataProvider } from "@/web-client/data-provider";
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

type ProjectsFavoriteState = Pick<
  ProjectsListQueryState,
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

const projectsGraphBuilder = getModuleGraphBuilderConfig(projectsListModuleDefinition);
const analysisControlClassName =
  "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0";
const PROJECT_CALENDAR_MODE_LABELS: Record<ProjectsListQueryState["calendarMode"], string> = {
  day: "Dia",
  week: "Semana",
  month: "Mes",
  year: "Ano",
};
const PROJECT_GANTT_SCALE_LABELS: Record<ProjectsListQueryState["ganttScale"], string> = {
  week: "Semana",
  month: "Mes",
  quarter: "Trimestre",
};

function parseProjectDate(value: string | null | undefined) {
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

function parseState(params: URLSearchParams): ProjectsListQueryState {
  const calendarMode = params.get("calendarMode");
  return {
    ...projectsListModuleDefinition.defaultQueryState,
    view: (params.get("view") as ProjectsListQueryState["view"]) ?? "table",
    searchText: params.get("q") ?? "",
    domain: parseDomain(params.get("d")) ?? null,
    groupBy: (params.get("g") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    pageIndex: parsePositiveInt(params.get("page"), 1) - 1,
    pageSize: Math.min(Math.max(parsePositiveInt(params.get("limit"), 20), 1), 100),
    timelineField: params.get("timelineField") === "endsAt" ? "endsAt" : "startsAt",
    timelineSortDirection: params.get("timelineSort") === "asc" ? "asc" : "desc",
    calendarField: params.get("calendarField") === "endsAt" ? "endsAt" : "startsAt",
    calendarMode:
      calendarMode === "day" ||
      calendarMode === "week" ||
      calendarMode === "year"
        ? (calendarMode as ProjectsListQueryState["calendarMode"])
        : "month",
    ganttScale:
      params.get("ganttScale") === "week" || params.get("ganttScale") === "quarter"
        ? (params.get("ganttScale") as ProjectsListQueryState["ganttScale"])
        : "month",
    rangeFrom: params.get("rangeFrom") ?? "",
    rangeTo: params.get("rangeTo") ?? "",
    graph: projectsGraphBuilder
      ? parseGraphBuilderStateFromParams(params, projectsGraphBuilder)
      : projectsListModuleDefinition.defaultQueryState.graph,
  };
}

function serializeState(state: ProjectsListQueryState) {
  return {
    view: state.view === "table" ? undefined : state.view,
    q: state.searchText.trim() || undefined,
    d: state.domain ? serializeDomain(state.domain) : undefined,
    g: state.groupBy.length ? state.groupBy.join(",") : undefined,
    page: state.pageIndex > 0 ? String(state.pageIndex + 1) : undefined,
    limit: state.pageSize === 20 ? undefined : String(state.pageSize),
    timelineField: state.timelineField === "startsAt" ? undefined : state.timelineField,
    timelineSort: state.timelineSortDirection === "desc" ? undefined : state.timelineSortDirection,
    calendarField: state.calendarField === "startsAt" ? undefined : state.calendarField,
    calendarMode: state.calendarMode === "month" ? undefined : state.calendarMode,
    ganttScale: state.ganttScale === "month" ? undefined : state.ganttScale,
    rangeFrom: state.rangeFrom || undefined,
    rangeTo: state.rangeTo || undefined,
    ...(projectsGraphBuilder
      ? serializeGraphBuilderStateToParams(state.graph, projectsGraphBuilder)
      : {}),
  };
}

function resolveStatusBadge(status: ApiProject["status"]) {
  const label = PROJECT_STATUS_LABELS[status] ?? status;
  switch (status) {
    case "ACTIVE":
      return <Badge variant="secondary">{label}</Badge>;
    case "CLOSED":
      return <Badge variant="outline">{label}</Badge>;
    default:
      return <Badge className="border-transparent bg-blue-600 text-white">{label}</Badge>;
  }
}

function projectColumns(): ColumnDef<ApiProject>[] {
  return [
    {
      accessorKey: "name",
      header: "Projeto",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-medium text-foreground">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.program?.name ?? "Sem programa"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags ?? [];
        if (!tags.length) return <span className="text-muted-foreground">-</span>;
        const visible = tags.slice(0, 3);
        const hiddenCount = Math.max(tags.length - visible.length, 0);
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((tag) => (
              <Badge
                key={`${row.original.id}:${tag}`}
                variant="outline"
                className="rounded-full px-2 text-[10px]"
              >
                {tag}
              </Badge>
            ))}
            {hiddenCount ? (
              <Badge variant="outline" className="rounded-full px-2 text-[10px]">
                +{hiddenCount}
              </Badge>
            ) : null}
          </div>
        );
      },
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

function ProjectCalendarCard({ project }: { project: ApiProject }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <div className="truncate text-sm font-medium text-foreground">{project.name}</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {project.program?.name ?? "Sem programa"}
      </div>
    </div>
  );
}

function resolveProjectGroupLabel(field: string, value: unknown) {
  if (field === "status") {
    return PROJECT_STATUS_LABELS[String(value) as ApiProject["status"]] ?? String(value ?? "Sem valor");
  }
  if (field === "createdAt") {
    return typeof value === "string" && value
      ? formatDateOnlyPtBR(value)
      : "Sem cadastro";
  }
  return String(value ?? "Sem valor");
}

function projectDateGetter(field: ProjectsListQueryState["timelineField"]) {
  return (project: ApiProject) => {
    const value = field === "startsAt" ? project.startsAt : project.endsAt;
    return parseProjectDate(value);
  };
}

function resolveKanbanColumnValue(project: ApiProject, field: string) {
  switch (field) {
    case "program.name":
      return project.program?.name ?? "Sem programa";
    case "program.type":
      return project.program?.type ?? "Sem tipo";
    case "tags":
      return project.tags?.[0] ?? "Sem tag";
    case "createdAt":
      return project.createdAt ? formatDateOnlyPtBR(project.createdAt.slice(0, 10)) : "Sem cadastro";
    case "status":
    default:
      return PROJECT_STATUS_LABELS[project.status] ?? project.status;
  }
}

function getProjectGanttStart(project: ApiProject) {
  return parseProjectDate(project.startsAt) ?? parseProjectDate(project.endsAt);
}

function getProjectGanttEnd(project: ApiProject) {
  return parseProjectDate(project.endsAt) ?? parseProjectDate(project.startsAt);
}

function resolveGanttGroupValue(project: ApiProject, field: string) {
  switch (field) {
    case "program.name":
      return project.program?.name ?? "Sem programa";
    case "program.type":
      return project.program?.type ?? "Sem tipo";
    case "tags":
      return project.tags;
    case "createdAt":
      return project.createdAt?.slice(0, 10) ?? null;
    case "status":
    default:
      return PROJECT_STATUS_LABELS[project.status] ?? project.status;
  }
}

export function ProjectsListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const columns = React.useMemo(() => projectColumns(), []);

  const canRead = hasModulePermission(projectsListModuleDefinition, "canRead", permissions);
  const canCreate = canUseModuleAction(projectsListModuleDefinition, "create", permissions);

  const [rows, setRows] = React.useState<ApiProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [state, setState] = useModuleQueryState<ProjectsListQueryState>({
    moduleDefinition: projectsListModuleDefinition,
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
      .search<ApiProject>("projects.list", {
        searchText: state.searchText,
        all: true,
      })
      .then((result) => setRows(result.data))
      .catch((nextError) => {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao carregar projetos.";
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
          status: row.status,
          tags: row.tags ?? [],
          createdAt: row.createdAt?.slice(0, 10) ?? null,
          "program.name": row.program?.name ?? null,
          "program.type": row.program?.type ?? null,
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
    (project: ApiProject) => {
      router.push(withTenantPath(`/projects/${project.id}`, tenantSlug));
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
        searchView: projectsListModuleDefinition.searchConfig,
        onClearGroupBy: () => setState((previous) => ({ ...previous, groupBy: [] })),
        onClearDomain: () =>
          setState((previous) => ({ ...previous, domain: null, pageIndex: 0 })),
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [removeDomainCondition, setState, state.domain, state.groupBy],
  );

  const favoriteSnapshot = React.useMemo<ProjectsFavoriteState>(
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

  const graphBuilder = React.useMemo(() => {
    return projectsGraphBuilder;
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

  const ganttGroupField = React.useMemo(() => {
    const selectedField = state.groupBy[0];
    if (selectedField) {
      return selectedField;
    }

    const ganttView = projectsListModuleDefinition.views.find(
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
                timelineField: next as ProjectsListQueryState["timelineField"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[11rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startsAt">Usar inicio</SelectItem>
              <SelectItem value="endsAt">Usar fim</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state.timelineSortDirection}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                timelineSortDirection: next as ProjectsListQueryState["timelineSortDirection"],
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
                calendarField: next as ProjectsListQueryState["calendarField"],
              }))
            }
          >
            <SelectTrigger className={`${analysisControlClassName} w-[11rem]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startsAt">Usar inicio</SelectItem>
              <SelectItem value="endsAt">Usar fim</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={state.calendarMode}
            onValueChange={(next) =>
              setState((previous) => ({
                ...previous,
                calendarMode: next as ProjectsListQueryState["calendarMode"],
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
      return graphBuilder ? (
        <GraphBuilderControls
          moduleDefinition={projectsListModuleDefinition}
          builder={graphBuilder}
          state={state.graph}
          rows={filteredRows as Array<Record<string, unknown>>}
          searchView={projectsListModuleDefinition.searchConfig}
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
                ganttScale: next as ProjectsListQueryState["ganttScale"],
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
    filteredRows,
    graphBuilder,
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
    const defaultState = projectsListModuleDefinition.defaultQueryState;

    if (state.groupBy.length) {
      facets.push({
        key: "analysis:groupBy",
        label: `Agrupar: ${state.groupBy.join(", ")}`,
        tone: "analysis" as const,
        analysisKind: "group" as const,
        icon: <Layers className="size-3.5" />,
      });
    }

    if (state.view === "timeline") {
      facets.push({
        key: "analysis:timelineField",
        label: `Timeline: ${state.timelineField === "startsAt" ? "Inicio" : "Fim"}`,
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
        label: `Calendario: ${state.calendarField === "startsAt" ? "Inicio" : "Fim"}`,
        tone: "analysis" as const,
        analysisKind: "time" as const,
        icon: <CalendarDays className="size-3.5" />,
      });
      facets.push({
        key: "analysis:calendarMode",
        label: `Modo: ${PROJECT_CALENDAR_MODE_LABELS[state.calendarMode]}`,
        tone: "analysis" as const,
        analysisKind: "time" as const,
        icon: <CalendarDays className="size-3.5" />,
      });
    }

    if (state.view === "gantt") {
      facets.push({
        key: "analysis:ganttScale",
        label: `Escala: ${PROJECT_GANTT_SCALE_LABELS[state.ganttScale]}`,
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
    state.groupBy,
    state.timelineField,
    state.timelineSortDirection,
    state.view,
  ]);

  const hasActiveAnalysis = React.useMemo(() => {
    const defaultState = projectsListModuleDefinition.defaultQueryState;
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
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem acesso a Projetos.</div>;
  }

  return (
    <EntityModuleShell<ProjectsListQueryState, ProjectsFavoriteState>
      moduleDefinition={projectsListModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      analysisFacets={analysisFacets}
      favoriteSnapshot={favoriteSnapshot}
      mapFavoriteToState={(snapshot) => snapshot}
      isLoading={loading}
      totalCount={filteredRows.length}
      canCreate={canCreate}
      onCreate={() => router.push(withTenantPath("/projects/new", tenantSlug))}
      onRefresh={() => setState((previous) => ({ ...previous }))}
      analysisSlot={analysisSlot}
      hasActiveAnalysis={hasActiveAnalysis}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          timelineField: projectsListModuleDefinition.defaultQueryState.timelineField,
          timelineSortDirection:
            projectsListModuleDefinition.defaultQueryState.timelineSortDirection,
          calendarField: projectsListModuleDefinition.defaultQueryState.calendarField,
          calendarMode: projectsListModuleDefinition.defaultQueryState.calendarMode,
          ganttScale: projectsListModuleDefinition.defaultQueryState.ganttScale,
          rangeFrom: projectsListModuleDefinition.defaultQueryState.rangeFrom,
          rangeTo: projectsListModuleDefinition.defaultQueryState.rangeTo,
          graph: projectsListModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? <div className="px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {state.view === "kanban" ? (
        <KanbanView
          items={filteredRows}
          getColumnKey={(project) => resolveKanbanColumnValue(project, state.groupBy[0] ?? "status")}
          getColumnLabel={(value) => value}
          renderCard={(project) => (
            <button type="button" className="w-full text-left" onClick={() => openDetail(project)}>
              <ProjectCalendarCard project={project} />
            </button>
          )}
        />
      ) : state.view === "timeline" ? (
        <TimelineView
          items={filteredRows}
          getDate={projectDateGetter(state.timelineField)}
          renderTitle={(project) => project.name}
          renderBody={(project) => (
            <div className="grid gap-1 text-[12px]">
              <div>{PROJECT_STATUS_LABELS[project.status] ?? project.status}</div>
              <div>{project.program?.name ?? "Sem programa"}</div>
            </div>
          )}
          sortDirection={state.timelineSortDirection}
        />
      ) : state.view === "calendar" ? (
        <CalendarView
          items={filteredRows}
          getDate={projectDateGetter(state.calendarField)}
          mode={state.calendarMode}
          onModeChange={(calendarMode) => setState((previous) => ({ ...previous, calendarMode }))}
          renderItem={(project) => (
            <button type="button" className="w-full text-left" onClick={() => openDetail(project)}>
              <ProjectCalendarCard project={project} />
            </button>
          )}
          dateFieldOptions={[
            { value: "startsAt", label: "Inicio" },
            { value: "endsAt", label: "Fim" },
          ]}
          activeDateField={state.calendarField}
          onActiveDateFieldChange={(next) =>
            setState((previous) => ({
              ...previous,
              calendarField: next as ProjectsListQueryState["calendarField"],
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
          getItemId={(project) => project.id}
          getItemLabel={(project) => project.name}
          getStartDate={getProjectGanttStart}
          getEndDate={getProjectGanttEnd}
          renderTitle={(project) => project.name}
          renderMeta={(project) => PROJECT_STATUS_LABELS[project.status] ?? project.status}
          renderExternalLabel={(project) => project.program?.name ?? null}
          getGroupValue={(project) => resolveGanttGroupValue(project, ganttGroupField)}
          getGroupLabel={(value) => resolveProjectGroupLabel(ganttGroupField, value)}
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
          <ListView<ApiProject>
            data={pagedRows}
            columns={columns}
            groupByFields={state.groupBy}
            resolveGroupLabel={resolveProjectGroupLabel}
            onRowClick={openDetail}
            getRowId={(row) => row.id}
            initialColumnPinning={{ left: ["name"] }}
          />
          <PaginationBar
            pageIndex={state.pageIndex}
            pageSize={state.pageSize}
            pageCount={pageCount}
            onPageIndexChange={(pageIndex) => setState((previous) => ({ ...previous, pageIndex }))}
            onPageSizeChange={(pageSize) =>
              setState((previous) => ({ ...previous, pageSize, pageIndex: 0 }))
            }
          />
        </>
      )}
    </EntityModuleShell>
  );
}
