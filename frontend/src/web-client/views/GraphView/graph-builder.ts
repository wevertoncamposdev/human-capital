"use client";

import {
  bucketLocalDate,
  formatDateOnlyPtBR,
  parseLocalDateOnly,
  toLocalIsoDate,
} from "@/lib/date";
import type {
  GraphBuilderConfig,
  GraphBuilderFieldConfig,
  GraphBuilderFilterConfig,
  GraphBuilderFilterValue,
  GraphBuilderState,
  GraphMetricOp,
  GraphTimeBucket,
} from "@/web-client/registry/types";
import type { SearchFieldDefinition } from "@/web-client/search/types";
import type { GraphChartType, GraphSeries } from "./types";

const NONE_QUERY_VALUE = "__none__";
const DEFAULT_COLOR_TOKENS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const METRIC_OP_LABELS: Record<GraphMetricOp, string> = {
  count: "Contagem",
  sum: "Soma",
  avg: "Media",
  min: "Minimo",
  max: "Maximo",
  distinct_count: "Distintos",
};

export const GRAPH_BUILDER_PARAM_KEYS = {
  groupBy: "gg",
  metricField: "gmf",
  metricOp: "gmo",
  timeField: "gtf",
  timeBucket: "gtb",
  chartType: "gct",
  filterPrefix: "gfi_",
} as const;

type AggregateAccumulator = {
  count: number;
  sum: number;
  min: number | null;
  max: number | null;
  distinct: Set<string>;
};

type GraphRow = Record<string, unknown>;

export type GraphViewModel = {
  data: Array<Record<string, unknown>>;
  xKey: "x";
  series: GraphSeries[];
  chartType: GraphChartType;
  emptyState: string;
  downloadFileName: string;
};

export function getGraphBuilderField(
  builder: GraphBuilderConfig,
  fieldName: string | null | undefined,
) {
  if (!fieldName) return undefined;
  return builder.fields.find((field) => field.field === fieldName);
}

export function getGraphBuilderGroupFields(builder: GraphBuilderConfig) {
  return builder.fields.filter((field) => field.kind !== "metric");
}

export function getGraphBuilderMetricFields(
  builder: GraphBuilderConfig,
  op: GraphMetricOp,
) {
  if (op === "count") {
    return builder.fields;
  }

  return builder.fields.filter((field) => {
    if (field.allowedOps?.includes(op)) return true;
    if (op === "distinct_count") return field.kind !== "date" || field.kind === "date";
    return field.kind === "metric";
  });
}

export function parseGraphBuilderStateFromParams(
  params: URLSearchParams,
  builder: GraphBuilderConfig,
): GraphBuilderState {
  const defaultState = builder.defaultState;
  const filters = Object.fromEntries(
    (builder.filters ?? []).map((filter) => {
      const raw = params.get(`${GRAPH_BUILDER_PARAM_KEYS.filterPrefix}${filter.id}`);
      return [filter.id, parseGraphBuilderFilterValue(raw, filter)];
    }),
  );

  return normalizeGraphBuilderState(builder, {
    groupBy: params.get(GRAPH_BUILDER_PARAM_KEYS.groupBy) ?? defaultState.groupBy,
    metric: {
      field: parseNullableQueryValue(
        params.get(GRAPH_BUILDER_PARAM_KEYS.metricField),
        defaultState.metric.field,
      ),
      op: normalizeGraphMetricOp(
        params.get(GRAPH_BUILDER_PARAM_KEYS.metricOp),
        defaultState.metric.op,
      ),
    },
    timeField: parseNullableQueryValue(
      params.get(GRAPH_BUILDER_PARAM_KEYS.timeField),
      defaultState.timeField,
    ),
    timeBucket: normalizeGraphTimeBucket(
      parseNullableQueryValue(
        params.get(GRAPH_BUILDER_PARAM_KEYS.timeBucket),
        defaultState.timeBucket,
      ),
      defaultState.timeBucket,
    ),
    chartType: normalizeGraphChartType(
      params.get(GRAPH_BUILDER_PARAM_KEYS.chartType),
      defaultState.chartType,
    ),
    filters,
  });
}

export function serializeGraphBuilderStateToParams(
  state: GraphBuilderState,
  builder: GraphBuilderConfig,
) {
  const normalized = normalizeGraphBuilderState(builder, state);
  const defaultState = normalizeGraphBuilderState(builder, builder.defaultState);
  const next: Record<string, string | undefined> = {
    [GRAPH_BUILDER_PARAM_KEYS.groupBy]:
      normalized.groupBy === defaultState.groupBy ? undefined : normalized.groupBy,
    [GRAPH_BUILDER_PARAM_KEYS.metricField]: serializeNullableQueryValue(
      normalized.metric.field,
      defaultState.metric.field,
    ),
    [GRAPH_BUILDER_PARAM_KEYS.metricOp]:
      normalized.metric.op === defaultState.metric.op ? undefined : normalized.metric.op,
    [GRAPH_BUILDER_PARAM_KEYS.timeField]: serializeNullableQueryValue(
      normalized.timeField,
      defaultState.timeField,
    ),
    [GRAPH_BUILDER_PARAM_KEYS.timeBucket]: serializeNullableQueryValue(
      normalized.timeBucket,
      defaultState.timeBucket,
    ),
    [GRAPH_BUILDER_PARAM_KEYS.chartType]:
      normalized.chartType === defaultState.chartType
        ? undefined
        : normalized.chartType,
  };

  (builder.filters ?? []).forEach((filter) => {
    const currentValue = normalized.filters?.[filter.id];
    const defaultValue = defaultState.filters?.[filter.id];
    next[`${GRAPH_BUILDER_PARAM_KEYS.filterPrefix}${filter.id}`] =
      isSameGraphBuilderValue(currentValue, defaultValue)
        ? undefined
        : serializeGraphBuilderFilterValue(currentValue, filter);
  });

  return next;
}

export function normalizeGraphBuilderState(
  builder: GraphBuilderConfig,
  state: Partial<GraphBuilderState> | undefined,
): GraphBuilderState {
  const defaultState = builder.defaultState;
  const groupFields = getGraphBuilderGroupFields(builder);
  const metricOp = normalizeGraphMetricOp(state?.metric?.op, defaultState.metric.op);
  const nextMetricField = resolveMetricField(builder, metricOp, state?.metric?.field);
  const nextTimeField = resolveTimeField(builder, state?.timeField ?? defaultState.timeField);
  const nextChartType = normalizeGraphChartType(
    state?.chartType,
    defaultState.chartType,
    Boolean(nextTimeField),
  );

  const nextFilters: Record<string, GraphBuilderFilterValue> = {};
  (builder.filters ?? []).forEach((filter) => {
    const value = state?.filters?.[filter.id] ?? defaultState.filters?.[filter.id];
    nextFilters[filter.id] = normalizeFilterValue(value, filter.type);
  });

  return {
    groupBy: resolveFieldName(
      groupFields.map((field) => field.field),
      state?.groupBy ?? defaultState.groupBy,
      defaultState.groupBy,
    ),
    metric: {
      field: nextMetricField,
      op: metricOp,
    },
    timeField: nextTimeField,
    timeBucket: normalizeGraphTimeBucket(
      state?.timeBucket ?? defaultState.timeBucket,
      defaultState.timeBucket,
    ),
    chartType: nextChartType,
    filters: nextFilters,
  };
}

export function setGraphBuilderFilterValue(
  previous: GraphBuilderState,
  builder: GraphBuilderConfig,
  filterId: string,
  value: GraphBuilderFilterValue,
): GraphBuilderState {
  return normalizeGraphBuilderState(builder, {
    ...previous,
    filters: {
      ...(previous.filters ?? {}),
      [filterId]: value,
    },
  });
}

export function getGraphBuilderFilterOptions(
  filter: GraphBuilderFilterConfig,
  rows: GraphRow[],
  fallbackField?: SearchFieldDefinition,
) {
  if (typeof filter.options === "function") {
    return filter.options(rows);
  }

  if (Array.isArray(filter.options)) {
    return filter.options;
  }

  return fallbackField?.options ?? [];
}

export function buildGraphViewModel(
  rows: GraphRow[],
  state: GraphBuilderState,
  builder: GraphBuilderConfig,
): GraphViewModel {
  const normalized = normalizeGraphBuilderState(builder, state);
  const filteredRows = rows.filter((row) => matchesAllGraphFilters(row, normalized, builder));
  const timeField = getGraphBuilderField(builder, normalized.timeField);
  const groupField = getGraphBuilderField(builder, normalized.groupBy);
  const downloadFileName = builder.downloadFileName ?? "grafico";
  const emptyState = builder.emptyState ?? "Nada para exibir.";

  if (!groupField) {
    return {
      data: [],
      xKey: "x",
      series: [],
      chartType: normalized.chartType,
      emptyState,
      downloadFileName,
    };
  }

  if (timeField) {
    return buildTimeSeriesModel(filteredRows, normalized, builder, groupField, timeField);
  }

  return buildCategorySeriesModel(filteredRows, normalized, builder, groupField);
}

function buildCategorySeriesModel(
  rows: GraphRow[],
  state: GraphBuilderState,
  builder: GraphBuilderConfig,
  groupField: GraphBuilderFieldConfig,
): GraphViewModel {
  const categories = new Map<
    string,
    { key: string; x: string; sortValue: string | number; metric: AggregateAccumulator }
  >();
  const metricLabel = buildMetricSeriesLabel(builder, state);

  rows.forEach((row) => {
    const metricValue = resolveMetricValue(builder, row, state);

    resolveGraphGroupCategories(groupField, row, state.timeBucket).forEach((category) => {
      const existing = categories.get(category.key) ?? {
        key: category.key,
        x: category.label,
        sortValue: category.sortValue,
        metric: createAggregateAccumulator(),
      };

      applyAggregateValue(existing.metric, state.metric.op, metricValue);
      categories.set(category.key, existing);
    });
  });

  const data = Array.from(categories.values())
    .sort((left, right) => compareGraphSortValues(left.sortValue, right.sortValue))
    .slice(0, builder.maxGroups ?? 24)
    .map((entry) => ({
      x: entry.x,
      value: finalizeAggregateValue(entry.metric, state.metric.op),
    }));

  return {
    data,
    xKey: "x",
    series: data.length
      ? [{ key: "value", label: metricLabel, color: DEFAULT_COLOR_TOKENS[0] }]
      : [],
    chartType: state.chartType,
    emptyState: builder.emptyState ?? "Nada para exibir.",
    downloadFileName: builder.downloadFileName ?? "grafico",
  };
}

function buildTimeSeriesModel(
  rows: GraphRow[],
  state: GraphBuilderState,
  builder: GraphBuilderConfig,
  groupField: GraphBuilderFieldConfig,
  timeField: GraphBuilderFieldConfig,
): GraphViewModel {
  const bucketEntries = new Map<
    string,
    {
      key: string;
      x: string;
      sortValue: string;
      series: Map<string, AggregateAccumulator>;
    }
  >();
  const seriesTotals = new Map<string, number>();

  rows.forEach((row) => {
    const rawDate = resolveFieldValue(timeField, row);
    const parsedDate = parseLocalDateOnly(rawDate as string | Date | null | undefined);
    if (!parsedDate) return;

    const bucket = bucketGraphDate(parsedDate, state.timeBucket ?? "month");
    const metricValue = resolveMetricValue(builder, row, state);

    resolveGraphGroupCategories(groupField, row, null).forEach((groupCategory) => {
      const entry = bucketEntries.get(bucket.key) ?? {
        key: bucket.key,
        x: bucket.label,
        sortValue: bucket.key,
        series: new Map<string, AggregateAccumulator>(),
      };
      const aggregate = entry.series.get(groupCategory.label) ?? createAggregateAccumulator();

      applyAggregateValue(aggregate, state.metric.op, metricValue);
      entry.series.set(groupCategory.label, aggregate);
      bucketEntries.set(bucket.key, entry);

      const total = seriesTotals.get(groupCategory.label) ?? 0;
      const nextValue =
        state.metric.op === "count"
          ? total + 1
          : total + numericGraphValue(metricValue);
      seriesTotals.set(groupCategory.label, nextValue);
    });
  });

  const maxGroups = builder.maxGroups ?? 6;
  const activeSeriesLabels = Array.from(seriesTotals.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, maxGroups)
    .map(([label]) => label);

  const series: GraphSeries[] = activeSeriesLabels.map((label, index) => ({
    key: `series_${index + 1}`,
    label,
    color: DEFAULT_COLOR_TOKENS[index % DEFAULT_COLOR_TOKENS.length],
  }));

  const seriesKeyMap = new Map(series.map((item) => [item.label, item.key]));

  const data = Array.from(bucketEntries.values())
    .sort((left, right) => left.sortValue.localeCompare(right.sortValue))
    .map((entry) => {
      const row: Record<string, unknown> = { x: entry.x };

      activeSeriesLabels.forEach((label) => {
        const key = seriesKeyMap.get(label);
        if (!key) return;
        const aggregate = entry.series.get(label);
        row[key] = aggregate ? finalizeAggregateValue(aggregate, state.metric.op) : 0;
      });

      return row;
    });

  return {
    data,
    xKey: "x",
    series,
    chartType: state.chartType,
    emptyState: builder.emptyState ?? "Nada para exibir.",
    downloadFileName: builder.downloadFileName ?? "grafico",
  };
}

function matchesAllGraphFilters(
  row: GraphRow,
  state: GraphBuilderState,
  builder: GraphBuilderConfig,
) {
  return (builder.filters ?? []).every((filter) => {
    const filterValue = state.filters?.[filter.id];
    if (!hasGraphBuilderValue(filterValue)) return true;

    const field = getGraphBuilderField(builder, filter.field);
    const rowValue = resolveFieldValue(field, row, filter.field);
    return matchesGraphFilterValue(rowValue, filterValue, filter.operator);
  });
}

function matchesGraphFilterValue(
  rowValue: unknown,
  filterValue: GraphBuilderFilterValue,
  operator: GraphBuilderFilterConfig["operator"],
) {
  if (Array.isArray(rowValue)) {
    const normalizedValues = rowValue.map((entry) => normalizeGraphText(entry)).filter(Boolean);
    if (!normalizedValues.length) {
      return operator === "is_null";
    }

    if (Array.isArray(filterValue)) {
      const normalizedFilters = filterValue
        .map((entry) => normalizeGraphText(entry))
        .filter(Boolean);
      if (!normalizedFilters.length) return true;
      if (operator === "in") {
        return normalizedFilters.some((entry) => normalizedValues.includes(entry));
      }
      if (operator === "not_in") {
        return normalizedFilters.every((entry) => !normalizedValues.includes(entry));
      }
      return true;
    }

    const normalizedFilter = normalizeGraphText(filterValue);
    if (operator === "=") return normalizedValues.includes(normalizedFilter);
    if (operator === "!=") return normalizedValues.every((entry) => entry !== normalizedFilter);
    if (operator === "contains" || operator === "ilike") {
      return normalizedValues.some((entry) => entry.includes(normalizedFilter));
    }
    if (operator === "starts_with") {
      return normalizedValues.some((entry) => entry.startsWith(normalizedFilter));
    }
    if (operator === "ends_with") {
      return normalizedValues.some((entry) => entry.endsWith(normalizedFilter));
    }
  }

  if (operator === "is_null") return isEmptyGraphValue(rowValue);
  if (operator === "not_null") return !isEmptyGraphValue(rowValue);

  if (Array.isArray(filterValue)) {
    const values = filterValue.map((value) => String(value));
    const textValue = String(rowValue ?? "");
    if (operator === "in") return values.includes(textValue);
    if (operator === "not_in") return !values.includes(textValue);
    return true;
  }

  if (typeof filterValue === "boolean") {
    const booleanValue = rowValue === true || String(rowValue) === "true";
    if (operator === "=") return booleanValue === filterValue;
    if (operator === "!=") return booleanValue !== filterValue;
    return true;
  }

  const leftDate = normalizeComparableDate(rowValue);
  const rightDate = normalizeComparableDate(filterValue);
  if (leftDate && rightDate) {
    if (operator === "=") return leftDate === rightDate;
    if (operator === "!=") return leftDate !== rightDate;
    if (operator === ">=") return leftDate >= rightDate;
    if (operator === "<=") return leftDate <= rightDate;
    if (operator === ">") return leftDate > rightDate;
    if (operator === "<") return leftDate < rightDate;
  }

  const leftNumber = numericGraphValue(rowValue);
  const rightNumber = numericGraphValue(filterValue);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    if (operator === "=") return leftNumber === rightNumber;
    if (operator === "!=") return leftNumber !== rightNumber;
    if (operator === ">=") return leftNumber >= rightNumber;
    if (operator === "<=") return leftNumber <= rightNumber;
    if (operator === ">") return leftNumber > rightNumber;
    if (operator === "<") return leftNumber < rightNumber;
  }

  const leftText = normalizeGraphText(rowValue);
  const rightText = normalizeGraphText(filterValue);

  if (operator === "=") return leftText === rightText;
  if (operator === "!=") return leftText !== rightText;
  if (operator === "contains" || operator === "ilike") {
    return leftText.includes(rightText);
  }
  if (operator === "starts_with") return leftText.startsWith(rightText);
  if (operator === "ends_with") return leftText.endsWith(rightText);
  if (operator === "in") return rightText.split(",").includes(leftText);
  if (operator === "not_in") return !rightText.split(",").includes(leftText);

  return true;
}

function createAggregateAccumulator(): AggregateAccumulator {
  return {
    count: 0,
    sum: 0,
    min: null,
    max: null,
    distinct: new Set<string>(),
  };
}

function applyAggregateValue(
  accumulator: AggregateAccumulator,
  op: GraphMetricOp,
  value: unknown,
) {
  if (op === "count") {
    accumulator.count += 1;
    return;
  }

  if (op === "distinct_count") {
    if (!isEmptyGraphValue(value)) {
      accumulator.distinct.add(String(value));
    }
    return;
  }

  const numeric = numericGraphValue(value);
  if (!Number.isFinite(numeric)) return;

  accumulator.count += 1;
  accumulator.sum += numeric;
  accumulator.min = accumulator.min === null ? numeric : Math.min(accumulator.min, numeric);
  accumulator.max = accumulator.max === null ? numeric : Math.max(accumulator.max, numeric);
}

function finalizeAggregateValue(
  accumulator: AggregateAccumulator,
  op: GraphMetricOp,
) {
  switch (op) {
    case "count":
      return accumulator.count;
    case "sum":
      return accumulator.sum;
    case "avg":
      return accumulator.count > 0 ? accumulator.sum / accumulator.count : 0;
    case "min":
      return accumulator.min ?? 0;
    case "max":
      return accumulator.max ?? 0;
    case "distinct_count":
      return accumulator.distinct.size;
    default:
      return 0;
  }
}

function resolveMetricValue(
  builder: GraphBuilderConfig,
  row: GraphRow,
  state: GraphBuilderState,
) {
  if (state.metric.op === "count") return 1;
  const metricField = getGraphBuilderField(builder, state.metric.field);
  return resolveFieldValue(metricField, row, state.metric.field ?? undefined);
}

function resolveMetricField(
  builder: GraphBuilderConfig,
  op: GraphMetricOp,
  value: string | null | undefined,
) {
  const allowedFields = getGraphBuilderMetricFields(builder, op);

  if (value && allowedFields.some((field) => field.field === value)) {
    return value;
  }

  if (op === "count") {
    return value ?? builder.defaultState.metric.field ?? null;
  }

  return allowedFields[0]?.field ?? builder.defaultState.metric.field ?? null;
}

function resolveTimeField(
  builder: GraphBuilderConfig,
  value: string | null | undefined,
) {
  if (!value) return null;

  const field = getGraphBuilderField(builder, value);
  return field?.kind === "date" ? value : null;
}

function resolveFieldName(
  allowedValues: string[],
  value: string | undefined,
  fallback: string,
) {
  if (value && allowedValues.includes(value)) return value;
  if (allowedValues.includes(fallback)) return fallback;
  return allowedValues[0] ?? fallback;
}

function normalizeGraphMetricOp(
  value: string | null | undefined,
  fallback: GraphMetricOp,
): GraphMetricOp {
  switch (value) {
    case "count":
    case "sum":
    case "avg":
    case "min":
    case "max":
    case "distinct_count":
      return value;
    default:
      return fallback;
  }
}

function normalizeGraphTimeBucket(
  value: string | null | undefined,
  fallback: GraphTimeBucket | null,
) {
  switch (value) {
    case "day":
    case "week":
    case "month":
    case "quarter":
    case "year":
      return value;
    default:
      return fallback ?? null;
  }
}

function normalizeGraphChartType(
  value: string | null | undefined,
  fallback: GraphChartType,
  hasTimeField = false,
) {
  const nextValue: GraphChartType =
    value === "bar" ||
    value === "bar_horizontal" ||
    value === "line" ||
    value === "area" ||
    value === "pie" ||
    value === "donut"
      ? value
      : fallback;

  if (hasTimeField && (nextValue === "pie" || nextValue === "donut")) {
    return "bar";
  }

  return nextValue;
}

function parseNullableQueryValue(
  value: string | null,
  fallback: string | null,
) {
  if (value === NONE_QUERY_VALUE) return null;
  return value ?? fallback ?? null;
}

function serializeNullableQueryValue(
  value: string | null,
  defaultValue: string | null,
) {
  if (value === defaultValue) return undefined;
  if (value === null && defaultValue !== null) return NONE_QUERY_VALUE;
  return value ?? undefined;
}

function parseGraphBuilderFilterValue(
  raw: string | null,
  filter: GraphBuilderFilterConfig,
): GraphBuilderFilterValue {
  if (raw === null) return undefined;

  switch (filter.type) {
    case "boolean":
      return raw === "true" ? true : raw === "false" ? false : undefined;
    case "number": {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    case "multi-select":
      return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    default:
      return raw;
  }
}

function serializeGraphBuilderFilterValue(
  value: GraphBuilderFilterValue,
  filter: GraphBuilderFilterConfig,
) {
  if (!hasGraphBuilderValue(value)) return undefined;

  if (Array.isArray(value)) {
    return value.join(",");
  }

  if (filter.type === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function normalizeFilterValue(
  value: GraphBuilderFilterValue,
  type: GraphBuilderFilterConfig["type"],
) {
  if (type === "number") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  if (type === "boolean") {
    if (value === true || value === false) return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }

  if (type === "multi-select") {
    return Array.isArray(value) ? value.filter(Boolean) : undefined;
  }

  if (typeof value === "string") {
    return value.trim() ? value : undefined;
  }

  return value;
}

function isSameGraphBuilderValue(
  left: GraphBuilderFilterValue,
  right: GraphBuilderFilterValue,
) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
  }

  return left === right;
}

function resolveFieldValue(
  field: GraphBuilderFieldConfig | undefined,
  row: GraphRow,
  fallbackFieldName?: string,
) {
  if (field?.getValue) {
    return field.getValue(row);
  }

  if (field) {
    return row[field.field];
  }

  if (fallbackFieldName) {
    return row[fallbackFieldName];
  }

  return undefined;
}

function resolveGraphGroupCategories(
  field: GraphBuilderFieldConfig,
  row: GraphRow,
  bucket: GraphTimeBucket | null,
) {
  const rawValue = resolveFieldValue(field, row);

  if (!Array.isArray(rawValue)) {
    return [toGraphCategory(field, rawValue, row, bucket)];
  }

  const values = Array.from(
    new Map(
      rawValue.map((entry) => {
        const nextValue =
          typeof entry === "string"
            ? entry.trim().replace(/\s+/g, " ")
            : entry;
        return [String(nextValue ?? "").trim(), nextValue];
      }),
    ).values(),
  ).filter((entry) => {
    if (entry === null || entry === undefined) return false;
    if (typeof entry === "string") return entry.length > 0;
    return true;
  });

  if (!values.length) {
    return [toGraphCategory(field, null, row, bucket)];
  }

  return values.map((entry) => toGraphCategory(field, entry, row, bucket));
}

function toGraphCategory(
  field: GraphBuilderFieldConfig,
  value: unknown,
  row: GraphRow,
  bucket: GraphTimeBucket | null,
) {
  if (field.kind === "date") {
    const parsedDate = parseLocalDateOnly(value as string | Date | null | undefined);
    if (parsedDate) {
      const bucketed = bucketGraphDate(parsedDate, bucket ?? "day");
      return {
        key: bucketed.key,
        label: bucketed.label,
        sortValue: bucketed.key,
      };
    }
  }

  const formatted = field.formatValue?.(value, row) ?? defaultGraphFormatValue(value, field);
  const sortValue =
    field.getSortValue?.(value, row) ??
    (typeof value === "number" ? value : normalizeGraphText(formatted));

  return {
    key: formatted,
    label: formatted,
    sortValue,
  };
}

function bucketGraphDate(date: Date, bucket: GraphTimeBucket) {
  if (bucket !== "quarter") {
    const nextBucket =
      bucket === "day" || bucket === "week" || bucket === "month" || bucket === "year"
        ? bucket
        : "month";
    return bucketLocalDate(date, nextBucket);
  }

  const isoDay = toLocalIsoDate(date);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const key = `${isoDay.slice(0, 4)}-Q${quarter}`;
  return { key, label: `Q${quarter}/${isoDay.slice(0, 4)}` };
}

function buildMetricSeriesLabel(
  builder: GraphBuilderConfig,
  state: GraphBuilderState,
) {
  if (state.metric.op === "count") {
    return METRIC_OP_LABELS.count;
  }

  const fieldLabel =
    getGraphBuilderField(builder, state.metric.field)?.label ??
    state.metric.field ??
    "Valor";

  return `${METRIC_OP_LABELS[state.metric.op]} de ${fieldLabel}`;
}

function defaultGraphFormatValue(
  value: unknown,
  field?: Pick<GraphBuilderFieldConfig, "emptyValueLabel" | "kind">,
) {
  if (value === null || value === undefined || value === "") {
    return field?.emptyValueLabel ?? "Sem valor";
  }

  if (field?.kind === "date") {
    return formatDateOnlyPtBR(value as string | Date);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("pt-BR");
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  return String(value);
}

function compareGraphSortValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), "pt-BR");
}

function numericGraphValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeComparableDate(value: unknown) {
  const parsed = parseLocalDateOnly(value as string | Date | null | undefined);
  return parsed ? toLocalIsoDate(parsed) : null;
}

function normalizeGraphText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function hasGraphBuilderValue(value: GraphBuilderFilterValue) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function isEmptyGraphValue(value: unknown) {
  if (Array.isArray(value)) return value.length === 0;
  return value === null || value === undefined || String(value).trim() === "";
}
