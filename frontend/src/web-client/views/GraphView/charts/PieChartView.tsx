"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type PieChartSeries = { key: string; label: string };

export function PieChartView({
  width,
  height,
  data,
  valueKey,
  nameKey,
  colors,
  isDonut,
  tooltipLabelFormatter,
  formatValue,
}: {
  width?: number;
  height?: number;
  data: Array<Record<string, unknown>>;
  valueKey: string;
  nameKey: string;
  colors: string[];
  isDonut: boolean;
  tooltipLabelFormatter: (value: unknown, payload: unknown[]) => string;
  formatValue: (value: unknown) => string;
}) {
  if (!width || !height) return null;

  const radiusBase = Math.min(width, height);
  const outerRadius = Math.min(220, Math.max(90, radiusBase / 2.6));
  const labelRadius = outerRadius + 18;

  return (
    <PieChart width={width} height={height} margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
      <ChartTooltip content={<ChartTooltipContent labelFormatter={tooltipLabelFormatter} />} />
      <Pie
        data={data}
        dataKey={valueKey}
        nameKey={nameKey}
        innerRadius={isDonut ? 60 : 0}
        outerRadius={outerRadius}
        paddingAngle={2}
        stroke="transparent"
        labelLine
        label={(props: { name?: unknown; value?: unknown; cx?: number; cy?: number; midAngle?: number }) => {
          const cx = typeof props.cx === "number" ? props.cx : 0;
          const cy = typeof props.cy === "number" ? props.cy : 0;
          const angle = typeof props.midAngle === "number" ? props.midAngle : 0;
          const rad = (-angle * Math.PI) / 180;
          const x = cx + labelRadius * Math.cos(rad);
          const y = cy + labelRadius * Math.sin(rad);
          const anchor = x > cx ? "start" : "end";

          const name = formatValue(props.name);
          const value = formatValue(props.value);
          const text = value ? `${name} ${value}` : name;

          return (
            <text x={x} y={y} fill="var(--foreground)" textAnchor={anchor} dominantBaseline="central" fontSize={12}>
              {text}
            </text>
          );
        }}
      >
        {data.map((_, index) => (
          <Cell key={index} fill={colors[index % colors.length]} />
        ))}
      </Pie>
    </PieChart>
  );
}
