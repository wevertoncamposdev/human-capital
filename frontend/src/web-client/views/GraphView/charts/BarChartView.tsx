"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCategoryTick, truncateText, type AxisLabelByValue } from "./chartUtils";
import { HorizontalBarChartView } from "./HorizontalBarChartView";

export type BarChartSeries = { key: string; color: string; label: string };

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function CategoryTick({
  x,
  y,
  payload,
  fill,
  angle = 0,
  textAnchor = "middle",
  maxLen = 18,
  dy = 16,
  labelByAxisValue,
}: {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
  fill: string;
  angle?: number;
  textAnchor?: "start" | "middle" | "end";
  maxLen?: number;
  dy?: number;
  labelByAxisValue: AxisLabelByValue;
}) {
  const xPos = toFiniteNumber(x);
  const yPos = toFiniteNumber(y);
  const rawValue = payload?.value;
  const text = formatCategoryTick(rawValue, labelByAxisValue, maxLen);

  return (
    <g transform={`translate(${xPos},${yPos})`}>
      <text
        dy={dy}
        style={{ fill, opacity: 1 }}
        fontSize={12}
        textAnchor={textAnchor}
        transform={angle ? `rotate(${angle})` : undefined}
      >
        {text}
      </text>
    </g>
  );
}

function NumberTick({
  x,
  y,
  payload,
  fill,
  formatter,
  textAnchor = "end",
  dx = -6,
  dy = 4,
}: {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
  fill: string;
  formatter: (value: unknown) => string;
  textAnchor?: "start" | "middle" | "end";
  dx?: number;
  dy?: number;
}) {
  const xPos = toFiniteNumber(x);
  const yPos = toFiniteNumber(y);
  const value = formatter(payload?.value);

  return (
    <text x={xPos} y={yPos} dx={dx} dy={dy} style={{ fill, opacity: 1 }} fontSize={12} textAnchor={textAnchor}>
      {value}
    </text>
  );
}

function SeriesValueLabel({
  x,
  y,
  width,
  value,
  fill,
  formatter,
  seriesLabel,
  showSeriesLabel,
}: {
  x?: number;
  y?: number;
  width?: number;
  value?: unknown;
  fill?: string;
  formatter: (value: unknown) => string;
  seriesLabel: string;
  showSeriesLabel: boolean;
}) {
  const xPos = toFiniteNumber(x);
  const yPos = toFiniteNumber(y);
  const barWidth = Math.max(0, toFiniteNumber(width));
  const valueLabel = formatter(value);
  const color = fill ?? "#0f172a";

  if (!showSeriesLabel || barWidth < 34) {
    return (
      <text
        x={xPos + barWidth / 2}
        y={yPos - 8}
        style={{ fill: color, opacity: 1 }}
        fontSize={12}
        textAnchor="middle"
      >
        {valueLabel}
      </text>
    );
  }

  const compactSeriesLabel = truncateText(seriesLabel, barWidth < 56 ? 8 : 12);

  return (
    <text
      x={xPos + barWidth / 2}
      y={yPos - 18}
      style={{ fill: color, opacity: 1 }}
      textAnchor="middle"
    >
      <title>{`${seriesLabel} ${valueLabel}`}</title>
      <tspan x={xPos + barWidth / 2} dy="0" fontSize={10}>
        {compactSeriesLabel}
      </tspan>
      <tspan x={xPos + barWidth / 2} dy="12" fontSize={12} fontWeight={600}>
        {valueLabel}
      </tspan>
    </text>
  );
}

export function BarChartView({
  width,
  height,
  data,
  axisKey,
  labelByAxisValue,
  isHorizontal,
  gridStroke,
  tickFill,
  xAxisAngle,
  xAxisTextAnchor,
  xTickMaxLen,
  yCategoryMaxLen,
  yCategoryWidth,
  yAxisWidth,
  series,
  formatValue,
  tooltipLabelFormatter,
}: {
  width?: number;
  height?: number;
  data: Array<Record<string, unknown>>;
  axisKey: string;
  labelByAxisValue: AxisLabelByValue;
  isHorizontal: boolean;
  gridStroke: string;
  tickFill: string;
  xAxisAngle: number;
  xAxisTextAnchor: "start" | "middle" | "end";
  xTickMaxLen: number;
  yCategoryMaxLen: number;
  yCategoryWidth: number;
  yAxisWidth: number;
  series: BarChartSeries[];
  formatValue: (value: unknown) => string;
  tooltipLabelFormatter: (value: unknown, payload: unknown[]) => string;
}) {
  if (!width || !height) return null;

  const showSeriesLabel = series.length > 1;

  if (isHorizontal) {
    return (
      <HorizontalBarChartView
        width={width}
        height={height}
        data={data}
        axisKey={axisKey}
        labelByAxisValue={labelByAxisValue}
        gridStroke={gridStroke}
        tickFill={tickFill}
        yCategoryMaxLen={yCategoryMaxLen}
        yCategoryWidth={yCategoryWidth}
        series={series}
        formatValue={formatValue}
        tooltipLabelFormatter={tooltipLabelFormatter}
      />
    );
  }

  const xAxisHeight = xAxisAngle ? 86 : 66;
  const marginTop = showSeriesLabel ? 44 : 18;

  return (
    <BarChart
      width={width}
      height={height}
      data={data}
      layout="horizontal"
      barGap={6}
      barCategoryGap="18%"
      margin={{ top: marginTop, right: 20, bottom: xAxisAngle ? 96 : 82, left: 24 }}
    >
      <CartesianGrid
        vertical={false}
        horizontal
        stroke={gridStroke}
        strokeOpacity={0.45}
      />

      <XAxis
        dataKey={axisKey}
        type="category"
        interval={0}
        minTickGap={0}
        allowDuplicatedCategory={false}
        axisLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        tickLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        tick={
          <CategoryTick
            fill={tickFill}
            angle={xAxisAngle}
            textAnchor={xAxisTextAnchor}
            maxLen={xTickMaxLen}
            labelByAxisValue={labelByAxisValue}
          />
        }
        tickMargin={12}
        height={xAxisHeight}
        padding={{ left: 8, right: 8 }}
        tickFormatter={(value) => formatCategoryTick(value, labelByAxisValue, xTickMaxLen)}
      />
      <YAxis
        tickLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        axisLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        tick={<NumberTick fill={tickFill} formatter={formatValue} />}
        tickFormatter={formatValue}
        width={yAxisWidth}
        allowDecimals={false}
        domain={[0, "dataMax"]}
        tickCount={6}
      />

      <ChartTooltip content={<ChartTooltipContent labelFormatter={tooltipLabelFormatter} />} />

      {series.map((s) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          fill={s.color}
          radius={[6, 6, 0, 0]}
          maxBarSize={84}
          minPointSize={2}
        >
          <LabelList
            dataKey={s.key}
            content={
              <SeriesValueLabel
                formatter={formatValue}
                seriesLabel={s.label}
                showSeriesLabel={showSeriesLabel}
              />
            }
          />
        </Bar>
      ))}
    </BarChart>
  );
}
