"use client";

export type GraphSeries = {
  key: string;
  label: string;
  color: string;
};

export type GraphChartType =
  | "bar"
  | "bar_horizontal"
  | "line"
  | "area"
  | "pie"
  | "donut";

export const GRAPH_CHART_TYPE_OPTIONS: Array<{
  value: GraphChartType;
  label: string;
}> = [
  { value: "bar", label: "Barras" },
  { value: "bar_horizontal", label: "Barras (horizontal)" },
  { value: "line", label: "Linha" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pizza" },
  { value: "donut", label: "Rosca" },
];

export const GRAPH_CHART_TYPE_OPTIONS_WITH_TIME = GRAPH_CHART_TYPE_OPTIONS.filter(
  (option) => option.value !== "pie" && option.value !== "donut",
);
