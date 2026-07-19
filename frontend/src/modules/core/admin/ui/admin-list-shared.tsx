"use client";

import * as React from "react";
import {
  ArrowUpDown,
  BarChart3,
  CalendarDays,
  Clock3,
  Layers,
  PieChart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SearchFacet } from "@/web-client/control-panel/SearchBar";
import {
  buildGraphViewModel,
  GraphBuilderControls,
  parseGraphBuilderStateFromParams,
  serializeGraphBuilderStateToParams,
  type GraphChartType,
} from "@/web-client/views/GraphView";
import {
  getModuleFieldLabel,
  getModuleGraphBuilderConfig,
} from "@/web-client/registry/module-utils";
import type {
  GraphBuilderConfig,
  RecordModuleDefinition,
  SortDirection,
} from "@/web-client/registry/types";
import { formatDateOnlyPtBR, formatDateTimePtBR } from "@/lib/date";
import type { AdminCollectionQueryState } from "@/modules/core/admin/config/admin-module-contract";
import type { Domain } from "@/web-client/domain/types";

export type AdminFavoriteState<TView extends string> = Pick<
  AdminCollectionQueryState<TView>,
  | "view"
  | "searchText"
  | "domain"
  | "groupBy"
  | "pageSize"
  | "timelineField"
  | "timelineSortDirection"
  | "calendarField"
  | "calendarMode"
  | "rangeFrom"
  | "rangeTo"
  | "graph"
>;

export const ANALYSIS_CONTROL_CLASS =
  "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0";

export const CALENDAR_MODE_LABELS: Record<AdminCollectionQueryState["calendarMode"], string> = {
  day: "Dia",
  week: "Semana",
  month: "Mes",
  year: "Ano",
};

export const GRAPH_METRIC_LABELS = {
  count: "Contagem",
  sum: "Soma",
  avg: "Media",
  min: "Minimo",
  max: "Maximo",
  distinct_count: "Distintos",
} as const;

export const GRAPH_CHART_LABELS: Record<GraphChartType, string> = {
  area: "Area",
  bar: "Barras",
  bar_horizontal: "Barras horizontais",
  donut: "Rosca",
  line: "Linha",
  pie: "Pizza",
};

export function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function toDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function booleanLabel(value: unknown, trueLabel = "Ativo", falseLabel = "Inativo") {
  return value ? trueLabel : falseLabel;
}

export function trimText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function badgeToneClassName(value: boolean) {
  return value
    ? "border-transparent bg-emerald-500/10 text-emerald-700"
    : "border-transparent bg-slate-500/10 text-slate-700";
}

export function buildFavoriteSnapshot<TView extends string>(
  state: AdminCollectionQueryState<TView>,
): AdminFavoriteState<TView> {
  return {
    view: state.view,
    searchText: state.searchText,
    domain: state.domain,
    groupBy: state.groupBy,
    pageSize: state.pageSize,
    timelineField: state.timelineField,
    timelineSortDirection: state.timelineSortDirection,
    calendarField: state.calendarField,
    calendarMode: state.calendarMode,
    rangeFrom: state.rangeFrom,
    rangeTo: state.rangeTo,
    graph: state.graph,
  };
}

export function parseAdminCollectionState<TView extends string>({
  params,
  defaultState,
  allowedViews,
  parseDomain,
  graphBuilder,
}: {
  params: URLSearchParams;
  defaultState: AdminCollectionQueryState<TView>;
  allowedViews: readonly TView[];
  parseDomain: (value: string | null) => Domain;
  graphBuilder?: GraphBuilderConfig;
}): AdminCollectionQueryState<TView> {
  const nextView = params.get("view");
  const view = allowedViews.includes(nextView as TView) ? (nextView as TView) : defaultState.view;
  const groupParam = params.get("g");
  const calendarMode = params.get("calendarMode");
  const timelineSort = params.get("timelineSort");

  return {
    ...defaultState,
    view,
    searchText: params.get("q") ?? "",
    domain: parseDomain(params.get("d")),
    groupBy: (groupParam ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    pageIndex: parsePositiveInt(params.get("page"), 1) - 1,
    pageSize: Math.min(Math.max(parsePositiveInt(params.get("limit"), defaultState.pageSize), 1), 100),
    timelineField: params.get("timelineField") ?? defaultState.timelineField,
    timelineSortDirection:
      timelineSort === "asc" || timelineSort === "desc"
        ? (timelineSort as SortDirection)
        : defaultState.timelineSortDirection,
    calendarField: params.get("calendarField") ?? defaultState.calendarField,
    calendarMode:
      calendarMode === "day" ||
      calendarMode === "week" ||
      calendarMode === "month" ||
      calendarMode === "year"
        ? calendarMode
        : defaultState.calendarMode,
    rangeFrom: params.get("rangeFrom") ?? "",
    rangeTo: params.get("rangeTo") ?? "",
    graph: graphBuilder
      ? parseGraphBuilderStateFromParams(params, graphBuilder)
      : defaultState.graph,
  };
}

export function serializeAdminCollectionState<TView extends string>(
  state: AdminCollectionQueryState<TView>,
  defaultState: AdminCollectionQueryState<TView>,
  serializeDomain: (domain: Domain) => string,
  graphBuilder?: GraphBuilderConfig,
) {
  return {
    view: state.view === defaultState.view ? undefined : state.view,
    q: state.searchText.trim() ? state.searchText.trim() : undefined,
    d: state.domain ? serializeDomain(state.domain) : undefined,
    g: state.groupBy.length ? state.groupBy.join(",") : undefined,
    page: state.pageIndex > 0 ? String(state.pageIndex + 1) : undefined,
    limit: state.pageSize === defaultState.pageSize ? undefined : String(state.pageSize),
    timelineField:
      state.timelineField === defaultState.timelineField ? undefined : state.timelineField,
    timelineSort:
      state.timelineSortDirection === defaultState.timelineSortDirection
        ? undefined
        : state.timelineSortDirection,
    calendarField:
      state.calendarField === defaultState.calendarField ? undefined : state.calendarField,
    calendarMode:
      state.calendarMode === defaultState.calendarMode ? undefined : state.calendarMode,
    rangeFrom: state.rangeFrom || undefined,
    rangeTo: state.rangeTo || undefined,
    ...(graphBuilder ? serializeGraphBuilderStateToParams(state.graph, graphBuilder) : {}),
  };
}

export function getTimelineFieldOptions<TState extends AdminCollectionQueryState<string>>(
  moduleDefinition: RecordModuleDefinition<TState>,
) {
  const timelineView = moduleDefinition.views.find((view) => view.viewType === "timeline");
  if (!timelineView || timelineView.viewType !== "timeline" || !timelineView.params) return [];

  const fields = timelineView.params.dateFields?.length
    ? timelineView.params.dateFields
    : [timelineView.params.startDateField];

  return fields.map((field) => ({
    value: field,
    label: getModuleFieldLabel(moduleDefinition, field, field),
  }));
}

export function getCalendarFieldOptions<TState extends AdminCollectionQueryState<string>>(
  moduleDefinition: RecordModuleDefinition<TState>,
) {
  const calendarView = moduleDefinition.views.find((view) => view.viewType === "calendar");
  if (!calendarView || calendarView.viewType !== "calendar" || !calendarView.params) return [];

  const fields = calendarView.params.dateFields?.length
    ? calendarView.params.dateFields
    : [calendarView.params.startDateField];

  return fields.map((field) => ({
    value: field,
    label: getModuleFieldLabel(moduleDefinition, field, field),
  }));
}

export function buildAnalysisSlot<TState extends AdminCollectionQueryState<string>>({
  moduleDefinition,
  state,
  setState,
  rows,
}: {
  moduleDefinition: RecordModuleDefinition<TState>;
  state: TState;
  setState: React.Dispatch<React.SetStateAction<TState>>;
  rows: Array<Record<string, unknown>>;
}) {
  const timelineFieldOptions = getTimelineFieldOptions(moduleDefinition);
  const calendarFieldOptions = getCalendarFieldOptions(moduleDefinition);
  const graphBuilder = getModuleGraphBuilderConfig(moduleDefinition);

  if (state.view === "timeline" && timelineFieldOptions.length) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Select
          value={state.timelineField}
          onValueChange={(next) =>
            setState((previous) => ({
              ...previous,
              timelineField: next,
            }))
          }
        >
          <SelectTrigger className={`${ANALYSIS_CONTROL_CLASS} w-[11rem]`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timelineFieldOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={state.timelineSortDirection}
          onValueChange={(next) =>
            setState((previous) => ({
              ...previous,
              timelineSortDirection: next as SortDirection,
            }))
          }
        >
          <SelectTrigger className={`${ANALYSIS_CONTROL_CLASS} w-[9rem]`}>
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

  if (state.view === "calendar" && calendarFieldOptions.length) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Select
          value={state.calendarField}
          onValueChange={(next) =>
            setState((previous) => ({
              ...previous,
              calendarField: next,
            }))
          }
        >
          <SelectTrigger className={`${ANALYSIS_CONTROL_CLASS} w-[11rem]`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {calendarFieldOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={state.calendarMode}
          onValueChange={(next) =>
            setState((previous) => ({
              ...previous,
              calendarMode: next as TState["calendarMode"],
            }))
          }
        >
          <SelectTrigger className={`${ANALYSIS_CONTROL_CLASS} w-[8rem]`}>
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
            setState((previous) => ({
              ...previous,
              rangeFrom: event.target.value,
            }))
          }
          className={`${ANALYSIS_CONTROL_CLASS} w-[9rem]`}
        />
        <Input
          type="date"
          value={state.rangeTo}
          onChange={(event) =>
            setState((previous) => ({
              ...previous,
              rangeTo: event.target.value,
            }))
          }
          className={`${ANALYSIS_CONTROL_CLASS} w-[9rem]`}
        />
      </div>
    );
  }

  if (state.view === "graph" && graphBuilder) {
    return (
      <GraphBuilderControls
        moduleDefinition={moduleDefinition}
        builder={graphBuilder}
        state={state.graph}
        rows={rows}
        searchView={moduleDefinition.searchConfig}
        hideGroupBy
        layout="grid"
        controlClassName={ANALYSIS_CONTROL_CLASS}
        onChange={(updater) =>
          setState((previous) => ({
            ...previous,
            graph: updater(previous.graph),
          }))
        }
      />
    );
  }

  return undefined;
}

export function buildAnalysisFacets<TState extends AdminCollectionQueryState<string>>({
  moduleDefinition,
  state,
  setState,
}: {
  moduleDefinition: RecordModuleDefinition<TState>;
  state: TState;
  setState: React.Dispatch<React.SetStateAction<TState>>;
}): SearchFacet[] {
  const defaultState = moduleDefinition.defaultQueryState;
  const graphBuilder = getModuleGraphBuilderConfig(moduleDefinition);
  const timelineFieldOptions = getTimelineFieldOptions(moduleDefinition);
  const calendarFieldOptions = getCalendarFieldOptions(moduleDefinition);
  const facets: SearchFacet[] = [];

  if (state.view === "timeline") {
    const timelineFieldLabel =
      timelineFieldOptions.find((option) => option.value === state.timelineField)?.label ??
      state.timelineField;

    facets.push({
      key: "analysis:timelineField",
      label: `Timeline: ${timelineFieldLabel}`,
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
    const calendarFieldLabel =
      calendarFieldOptions.find((option) => option.value === state.calendarField)?.label ??
      state.calendarField;

    facets.push({
      key: "analysis:calendarField",
      label: `Calendario: ${calendarFieldLabel}`,
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

  if (state.view === "graph" && graphBuilder) {
    const groupField =
      graphBuilder.fields.find((field) => field.field === state.graph.groupBy)?.label ??
      state.graph.groupBy;
    const metricField =
      state.graph.metric.field &&
      graphBuilder.fields.find((field) => field.field === state.graph.metric.field)?.label;
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
        graphBuilder.fields.find((field) => field.field === state.graph.timeField)?.label ??
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
}

export function hasActiveAnalysis<TState extends AdminCollectionQueryState<string>>(
  moduleDefinition: RecordModuleDefinition<TState>,
  state: TState,
) {
  const defaultState = moduleDefinition.defaultQueryState;

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

  return false;
}

export function buildGraphModel(
  rows: Array<Record<string, unknown>>,
  state: AdminCollectionQueryState<string>,
  moduleDefinition: RecordModuleDefinition,
): ReturnType<typeof buildGraphViewModel> | null {
  const graphBuilder = getModuleGraphBuilderConfig(moduleDefinition);
  return graphBuilder ? buildGraphViewModel(rows, state.graph, graphBuilder) : null;
}

export function renderLoadingState(message: string) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function formatDateLabel(value?: string | null) {
  return formatDateOnlyPtBR(value ?? null) || "-";
}

export function formatDateTimeLabel(value?: string | null) {
  return formatDateTimePtBR(value ?? null) || "-";
}
