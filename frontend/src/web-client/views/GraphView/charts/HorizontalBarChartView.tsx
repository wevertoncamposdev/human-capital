"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { resolveAxisLabel, truncateText, type AxisLabelByValue } from "./chartUtils";

export type HorizontalBarChartSeries = { key: string; color: string; label: string };

type TickLabel = { raw: string; display: string };

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function NumberTick({
  x,
  y,
  payload,
  fill,
  formatter,
  textAnchor = "middle",
  dx = 0,
}: {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
  fill: string;
  formatter: (value: unknown) => string;
  textAnchor?: "start" | "middle" | "end";
  dx?: number;
}) {
  const xPos = toFiniteNumber(x);
  const yPos = toFiniteNumber(y);
  const value = formatter(payload?.value);

  return (
    <text
      x={xPos}
      y={yPos}
      dx={dx}
      style={{ fill, opacity: 1 }}
      fontSize={12}
      textAnchor={textAnchor}
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
}

function CategoryLabel({
  x,
  y,
  height,
  value,
  fill,
  labelByKey,
  viewBox,
}: {
  x?: number;
  y?: number;
  height?: number;
  value?: unknown;
  fill?: string;
  labelByKey: Map<string, TickLabel>;
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
}) {
  const vbX = toFiniteNumber(viewBox?.x ?? x);
  const vbY = toFiniteNumber(viewBox?.y ?? y);
  const vbH = Math.max(0, toFiniteNumber(viewBox?.height ?? height));

  const key = value === null || value === undefined ? "" : String(value);
  const label = labelByKey.get(key);
  const display = label?.display ?? "—";
  const raw = label?.raw ?? "";

  return (
    <text
      x={vbX - 12}
      y={vbY + vbH / 2}
      style={{ fill: fill ?? "#0f172a", opacity: 1 }}
      fontSize={12}
      textAnchor="end"
      dominantBaseline="middle"
    >
      {display}
      {raw ? <title>{raw}</title> : null}
    </text>
  );
}

function ValueLabel({
  x,
  y,
  width,
  height,
  value,
  fill,
  formatter,
  seriesLabel,
  showSeriesLabel,
  chartWidth,
  rightLimit,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: unknown;
  fill?: string;
  formatter: (value: unknown) => string;
  seriesLabel: string;
  showSeriesLabel: boolean;
  chartWidth: number;
  rightLimit: number;
}) {
  const xPos = toFiniteNumber(x);
  const yPos = toFiniteNumber(y);
  const barWidth = Math.max(0, toFiniteNumber(width));
  const barHeight = Math.max(0, toFiniteNumber(height));
  const valueLabel = formatter(value);
  const compactSeriesLabel = truncateText(seriesLabel, 18);
  const text = showSeriesLabel ? `${compactSeriesLabel} ${valueLabel}` : valueLabel;
  const color = fill ?? "#0f172a";

  const desiredX = xPos + barWidth + 6;
  const maxX = Math.max(0, chartWidth - rightLimit);
  const clampedX = Math.min(desiredX, maxX);
  const anchor = clampedX < desiredX ? "end" : "start";

  return (
    <text
      x={clampedX}
      y={yPos + barHeight / 2}
      style={{ fill: color, opacity: 1 }}
      fontSize={12}
      textAnchor={anchor}
      dominantBaseline="middle"
    >
      <title>{`${seriesLabel} ${valueLabel}`}</title>
      {text}
    </text>
  );
}

export function HorizontalBarChartView({
  width,
  height,
  data,
  axisKey,
  labelByAxisValue,
  gridStroke,
  tickFill,
  yCategoryMaxLen,
  yCategoryWidth,
  series,
  formatValue,
  tooltipLabelFormatter,
}: {
  width?: number;
  height?: number;
  data: Array<Record<string, unknown>>;
  axisKey: string;
  labelByAxisValue: AxisLabelByValue;
  gridStroke: string;
  tickFill: string;
  yCategoryMaxLen: number;
  yCategoryWidth: number;
  series: HorizontalBarChartSeries[];
  formatValue: (value: unknown) => string;
  tooltipLabelFormatter: (value: unknown, payload: unknown[]) => string;
}) {
  const safeWidth = toFiniteNumber(width);
  const safeHeight = toFiniteNumber(height);
  const hasSize = safeWidth > 0 && safeHeight > 0;

  const keyed = React.useMemo(() => {
    const keyField = "__hb_k";
    const labelByKey = new Map<string, TickLabel>();
    const next = data.map((row, index) => {
      const key = String(index);
      const raw = resolveAxisLabel(row[axisKey], labelByAxisValue).trim() || "—";
      const display = truncateText(raw, yCategoryMaxLen);
      labelByKey.set(key, { raw, display });
      return { ...row, [keyField]: key } as Record<string, unknown>;
    });
    return { keyField, data: next, labelByKey };
  }, [axisKey, data, labelByAxisValue, yCategoryMaxLen]);

  const showSeriesLabel = series.length > 1;
  const rightMargin = React.useMemo(() => {
    if (!showSeriesLabel) return 56;
    const longestLabel = series.reduce((max, item) => Math.max(max, item.label.length), 0);
    return Math.min(220, Math.max(128, Math.round(longestLabel * 6.4 + 44)));
  }, [series, showSeriesLabel]);
  const margin = React.useMemo(
    () => ({ top: 18, right: rightMargin, bottom: 18, left: 18 }),
    [rightMargin],
  );

  const maxBarSize = React.useMemo(() => {
    const usableHeight = Math.max(0, safeHeight - margin.top - margin.bottom);
    const perRow = keyed.data.length ? usableHeight / keyed.data.length : usableHeight;
    return Math.max(12, Math.min(38, Math.floor(perRow * 0.55)));
  }, [keyed.data.length, margin.bottom, margin.top, safeHeight]);

  if (!hasSize) return null;

  return (
    <BarChart
      width={safeWidth}
      height={safeHeight}
      data={keyed.data}
      layout="vertical"
      barGap={6}
      barCategoryGap="28%"
      margin={margin}
    >
      <CartesianGrid vertical stroke={gridStroke} strokeOpacity={0.45} />

      <XAxis
        type="number"
        tickLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        axisLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        tick={<NumberTick fill={tickFill} formatter={formatValue} />}
        tickMargin={8}
        allowDecimals={false}
        domain={[0, "dataMax"]}
        tickCount={6}
      />

      <YAxis
        type="category"
        dataKey={keyed.keyField}
        interval={0}
        minTickGap={0}
        scale="band"
        allowDuplicatedCategory={false}
        tickLine={false}
        axisLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        tick={false}
        width={yCategoryWidth}
      />

      <ChartTooltip content={<ChartTooltipContent labelFormatter={tooltipLabelFormatter} />} />

      {series.map((s, idx) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          fill={s.color}
          radius={[0, 6, 6, 0]}
          maxBarSize={maxBarSize}
          minPointSize={2}
        >
          {idx === 0 ? (
            <LabelList dataKey={keyed.keyField} content={<CategoryLabel labelByKey={keyed.labelByKey} fill={tickFill} />} />
          ) : null}
          <LabelList
            dataKey={s.key}
            content={
              <ValueLabel
                formatter={formatValue}
                seriesLabel={s.label}
                showSeriesLabel={showSeriesLabel}
                chartWidth={safeWidth}
                rightLimit={margin.right + 6}
              />
            }
            fill={tickFill}
            className="text-[11px]"
          />
        </Bar>
      ))}
    </BarChart>
  );
}
