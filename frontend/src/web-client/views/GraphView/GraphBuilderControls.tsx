"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  GraphBuilderConfig,
  GraphBuilderFilterConfig,
  GraphBuilderState,
  GraphMetricOp,
  RecordModuleDefinition,
} from "@/web-client/registry/types";
import { getModuleFieldLabel } from "@/web-client/registry/module-utils";
import type { SearchFieldDefinition, SearchViewDefinition } from "@/web-client/search/types";
import {
  getGraphBuilderFilterOptions,
  getGraphBuilderGroupFields,
  getGraphBuilderMetricFields,
  normalizeGraphBuilderState,
  setGraphBuilderFilterValue,
} from "./graph-builder";
import {
  GRAPH_CHART_TYPE_OPTIONS,
  GRAPH_CHART_TYPE_OPTIONS_WITH_TIME,
} from "./types";

const DEFAULT_CONTROL_CLASS_NAME =
  "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0";

const METRIC_OP_OPTIONS: Array<{ value: GraphMetricOp; label: string }> = [
  { value: "count", label: "Contagem" },
  { value: "sum", label: "Soma" },
  { value: "avg", label: "Media" },
  { value: "min", label: "Minimo" },
  { value: "max", label: "Maximo" },
  { value: "distinct_count", label: "Distintos" },
];

type GraphBuilderControlsProps = {
  moduleDefinition: RecordModuleDefinition;
  builder: GraphBuilderConfig;
  state: GraphBuilderState;
  onChange: (updater: (previous: GraphBuilderState) => GraphBuilderState) => void;
  rows?: Array<Record<string, unknown>>;
  searchView?: SearchViewDefinition;
  className?: string;
  controlClassName?: string;
  hideGroupBy?: boolean;
  layout?: "wrap" | "grid";
};

export function GraphBuilderControls({
  moduleDefinition,
  builder,
  state,
  onChange,
  rows = [],
  searchView,
  className,
  controlClassName = DEFAULT_CONTROL_CLASS_NAME,
  hideGroupBy = false,
  layout = "wrap",
}: GraphBuilderControlsProps) {
  const normalizedState = React.useMemo(
    () => normalizeGraphBuilderState(builder, state),
    [builder, state],
  );
  const searchFieldMap = React.useMemo(
    () =>
      new Map(
        (searchView?.fields ?? []).map((field) => [field.name, field] as const),
      ),
    [searchView],
  );
  const groupFields = React.useMemo(
    () => getGraphBuilderGroupFields(builder),
    [builder],
  );
  const metricOpOptions = React.useMemo(() => {
    return METRIC_OP_OPTIONS.filter((option) => {
      if (option.value === "count") return true;
      return getGraphBuilderMetricFields(builder, option.value).length > 0;
    });
  }, [builder]);
  const metricFields = React.useMemo(
    () => getGraphBuilderMetricFields(builder, normalizedState.metric.op),
    [builder, normalizedState.metric.op],
  );
  const chartTypeOptions = normalizedState.timeField
    ? GRAPH_CHART_TYPE_OPTIONS_WITH_TIME
    : GRAPH_CHART_TYPE_OPTIONS;
  const isGridLayout = layout === "grid";
  const containerClassName = isGridLayout
    ? "grid grid-cols-1 gap-x-4 gap-y-1.5 md:grid-cols-2"
    : "flex flex-wrap items-center gap-1.5";
  const widthClass = React.useCallback(
    (compactWidth: string) => `${controlClassName} ${isGridLayout ? "w-full" : compactWidth}`,
    [controlClassName, isGridLayout],
  );

  return (
    <div className={[containerClassName, className].filter(Boolean).join(" ")}>
      {!hideGroupBy ? (
        <Select
          value={normalizedState.groupBy}
          onValueChange={(groupBy) =>
            onChange((previous) =>
              normalizeGraphBuilderState(builder, {
                ...previous,
                groupBy,
              }),
            )
          }
        >
          <SelectTrigger className={widthClass("w-[11rem]")}>
            <SelectValue placeholder="Agrupar..." />
          </SelectTrigger>
          <SelectContent>
            {groupFields.map((field) => (
              <SelectItem key={field.field} value={field.field}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={normalizedState.metric.op}
        onValueChange={(metricOp) =>
          onChange((previous) =>
            normalizeGraphBuilderState(builder, {
              ...previous,
              metric: {
                ...previous.metric,
                op: metricOp as GraphMetricOp,
              },
            }),
          )
        }
      >
        <SelectTrigger className={widthClass("w-[10rem]")}>
          <SelectValue placeholder="Calculo..." />
        </SelectTrigger>
        <SelectContent>
          {metricOpOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {normalizedState.metric.op !== "count" && metricFields.length ? (
        <Select
          value={normalizedState.metric.field ?? metricFields[0]?.field}
          onValueChange={(metricField) =>
            onChange((previous) =>
              normalizeGraphBuilderState(builder, {
                ...previous,
                metric: {
                  ...previous.metric,
                  field: metricField,
                },
              }),
            )
          }
        >
          <SelectTrigger className={widthClass("w-[12rem]")}>
            <SelectValue placeholder="Campo..." />
          </SelectTrigger>
          <SelectContent>
            {metricFields.map((field) => (
              <SelectItem key={field.field} value={field.field}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {builder.fields.some((field) => field.kind === "date") ? (
        <>
          {!isGridLayout ? <div className="hidden h-6 w-px bg-border/60 sm:block" /> : null}
          <Select
            value={normalizedState.timeField ?? "__none__"}
            onValueChange={(timeField) =>
              onChange((previous) =>
                normalizeGraphBuilderState(builder, {
                  ...previous,
                  timeField: timeField === "__none__" ? null : timeField,
                }),
              )
            }
          >
            <SelectTrigger className={widthClass("w-[11rem]")}>
              <SelectValue placeholder="Tempo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem tempo</SelectItem>
              {builder.fields
                .filter((field) => field.kind === "date")
                .map((field) => (
                  <SelectItem key={field.field} value={field.field}>
                    {field.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {normalizedState.timeField ? (
            <Select
              value={normalizedState.timeBucket ?? "month"}
              onValueChange={(timeBucket) =>
                onChange((previous) =>
                  normalizeGraphBuilderState(builder, {
                    ...previous,
                    timeBucket: timeBucket as GraphBuilderState["timeBucket"],
                    chartType:
                      previous.chartType === "pie" || previous.chartType === "donut"
                        ? "bar"
                        : previous.chartType,
                  }),
                )
              }
            >
              <SelectTrigger className={widthClass("w-[9rem]")}>
                <SelectValue placeholder="Bucket..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Dia</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </>
      ) : null}

      <Select
        value={normalizedState.chartType}
        onValueChange={(chartType) =>
          onChange((previous) =>
            normalizeGraphBuilderState(builder, {
              ...previous,
              chartType: chartType as GraphBuilderState["chartType"],
            }),
          )
        }
      >
        <SelectTrigger className={widthClass("w-[10rem]")}>
          <SelectValue placeholder="Grafico..." />
        </SelectTrigger>
        <SelectContent>
          {chartTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(builder.filters ?? []).length && !isGridLayout ? (
        <div className="hidden h-6 w-px bg-border/60 sm:block" />
      ) : null}

      {(builder.filters ?? []).map((filter) =>
        renderGraphFilterControl({
          filter,
          builder,
          moduleDefinition,
          searchField: searchFieldMap.get(filter.field),
          rows,
          state: normalizedState,
          onChange,
          controlClassName,
          fullWidth: isGridLayout,
        }),
      )}
    </div>
  );
}

function renderGraphFilterControl({
  filter,
  builder,
  moduleDefinition,
  searchField,
  rows,
  state,
  onChange,
  controlClassName,
  fullWidth,
}: {
  filter: GraphBuilderFilterConfig;
  builder: GraphBuilderConfig;
  moduleDefinition: RecordModuleDefinition;
  searchField?: SearchFieldDefinition;
  rows: Array<Record<string, unknown>>;
  state: GraphBuilderState;
  onChange: (updater: (previous: GraphBuilderState) => GraphBuilderState) => void;
  controlClassName: string;
  fullWidth: boolean;
}) {
  const label =
    filter.label ||
    searchField?.label ||
    getModuleFieldLabel(moduleDefinition, filter.field, filter.field);
  const type = filter.type ?? searchField?.type ?? "text";
  const options = getGraphBuilderFilterOptions(filter, rows, searchField);
  const value = state.filters?.[filter.id];
  const widthClass = fullWidth ? "w-full" : "w-[12rem]";

  if (
    type === "select" ||
    type === "enum" ||
    type === "uuid" ||
    (type === "boolean" && options.length)
  ) {
    return (
      <Select
        key={filter.id}
        value={value === undefined || value === null || value === "" ? "__all__" : String(value)}
        onValueChange={(next) =>
          onChange((previous) =>
            setGraphBuilderFilterValue(
              previous,
              builder,
              filter.id,
              next === "__all__" ? undefined : next,
            ),
          )
        }
      >
        <SelectTrigger className={`${controlClassName} ${widthClass}`}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{label}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (type === "boolean") {
    return (
      <Select
        key={filter.id}
        value={
          value === true ? "true" : value === false ? "false" : "__all__"
        }
        onValueChange={(next) =>
          onChange((previous) =>
            setGraphBuilderFilterValue(
              previous,
              builder,
              filter.id,
              next === "__all__" ? undefined : next === "true",
            ),
          )
        }
      >
        <SelectTrigger className={`${controlClassName} ${fullWidth ? "w-full" : "w-[9rem]"}`}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{label}</SelectItem>
          <SelectItem value="true">Sim</SelectItem>
          <SelectItem value="false">Nao</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      key={filter.id}
      type={type === "date" ? "date" : type === "number" ? "number" : "text"}
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(event) =>
        onChange((previous) =>
          setGraphBuilderFilterValue(
            previous,
            builder,
            filter.id,
            event.target.value || undefined,
          ),
        )
      }
      placeholder={filter.placeholder ?? label}
      className={`${controlClassName} ${fullWidth ? "w-full" : "w-[10rem]"}`}
    />
  );
}
