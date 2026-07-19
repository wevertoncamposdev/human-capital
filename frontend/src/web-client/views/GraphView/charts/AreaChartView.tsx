"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCategoryTick, type AxisLabelByValue } from "./chartUtils";

export type AreaChartSeries = { key: string; color: string };

export function AreaChartView({
  width,
  height,
  data,
  axisKey,
  labelByAxisValue,
  gridStroke,
  tickFill,
  xAxisAngle,
  xAxisTextAnchor,
  xTickMaxLen,
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
  xAxisAngle: number;
  xAxisTextAnchor: "start" | "middle" | "end";
  xTickMaxLen: number;
  series: AreaChartSeries[];
  formatValue: (value: unknown) => string;
  tooltipLabelFormatter: (value: unknown, payload: unknown[]) => string;
}) {
  if (!width || !height) return null;

  const tick = { fill: tickFill, fontSize: 12, opacity: 1 };

  return (
    <AreaChart width={width} height={height} data={data} margin={{ top: 18, right: 20, bottom: 32, left: 24 }}>
      <CartesianGrid vertical={false} stroke={gridStroke} strokeOpacity={0.45} />
      <XAxis
        dataKey={axisKey}
        axisLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        tickLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        tick={{ ...tick, textAnchor: xAxisTextAnchor }}
        angle={xAxisAngle}
        minTickGap={18}
        interval={data.length <= 12 ? 0 : "preserveStartEnd"}
        tickMargin={8}
        height={data.length > 10 ? 68 : 44}
        tickFormatter={(value) => formatCategoryTick(value, labelByAxisValue, xTickMaxLen)}
      />
      <YAxis
        tickLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        axisLine={{ stroke: gridStroke, strokeOpacity: 0.6 }}
        tick={tick}
        tickFormatter={formatValue}
        width={56}
      />
      <ChartTooltip content={<ChartTooltipContent labelFormatter={tooltipLabelFormatter} />} />
      {series.map((s) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          stroke={s.color}
          fill={s.color}
          fillOpacity={0.2}
          label={{ position: "top", fill: tickFill, fontSize: 12 }}
        />
      ))}
    </AreaChart>
  );
}
