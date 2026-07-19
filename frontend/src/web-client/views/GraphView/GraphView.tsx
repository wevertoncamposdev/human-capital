"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ModuleEmptyState,
  MODULE_SURFACE_CLASS_NAME,
} from "@/web-client/ui/ModulePrimitives";
import { AreaChartView, BarChartView, LineChartView, PieChartView } from "./charts";
import { safeLabel } from "./charts/chartUtils";
import type { GraphChartType, GraphSeries } from "./types";

const INTERNAL_CATEGORY_KEY = "__graph_category_key";
const INTERNAL_CATEGORY_LABEL = "__graph_category_label";

export function GraphView<TDatum extends Record<string, unknown>>({
  data,
  xKey,
  series,
  chartType = "bar",
  height = 520,
  className,
  emptyState = "Nada para exibir.",
  downloadFileName = "grafico",
}: {
  data: TDatum[];
  xKey: keyof TDatum & string;
  series: GraphSeries[];
  chartType?: GraphChartType;
  height?: number;
  className?: string;
  emptyState?: string;
  downloadFileName?: string;
}) {
  const safeHeight = React.useMemo(() => {
    const numeric = typeof height === "number" ? height : Number(height);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 520;
  }, [height]);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const resolveCssColorToRgb = React.useCallback((value: string) => {
    if (typeof document === "undefined") return value;

    const cached = (resolveCssColorToRgb as unknown as { cache?: Map<string, string> }).cache;
    const cache = cached ?? new Map<string, string>();
    (resolveCssColorToRgb as unknown as { cache?: Map<string, string> }).cache = cache;
    const fromCache = cache.get(value);
    if (fromCache) return fromCache;

    const el = document.createElement("span");
    el.style.color = value;
    el.style.position = "absolute";
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    document.body.appendChild(el);
    const rgb = getComputedStyle(el).color || value;
    el.remove();

    cache.set(value, rgb);
    return rgb;
  }, []);

  const resolvedSeries = React.useMemo(() => {
    return series.map((s) => ({
      ...s,
      resolvedColor: resolveCssColorToRgb(s.color),
    }));
  }, [resolveCssColorToRgb, series]);

  const config = React.useMemo(() => {
    const next: ChartConfig = {};
    resolvedSeries.forEach((s) => {
      next[s.key] = { label: s.label, color: s.resolvedColor };
    });
    return next;
  }, [resolvedSeries]);

  const numberFormatter = React.useMemo(() => new Intl.NumberFormat("pt-BR"), []);
  const formatValue = React.useCallback(
    (value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) return numberFormatter.format(value);
      if (typeof value === "bigint") return value.toString();
      if (typeof value === "string") return value;
      return value === null || value === undefined ? "" : String(value);
    },
    [numberFormatter],
  );

  const prepared = React.useMemo<{
    data: Array<Record<string, unknown>>;
    axisKey: string;
    labelKey: string;
    labelByAxisValue: Map<string, string> | null;
  }>(() => {
    const counts = new Map<string, number>();
    const values = data.map((row) => safeLabel((row as Record<string, unknown>)[xKey]).trim());
    values.forEach((v) => {
      const key = v;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const hasDuplicates = Array.from(counts.values()).some((count) => count > 1);
    if (!hasDuplicates) {
      return {
        data: data as Array<Record<string, unknown>>,
        axisKey: xKey,
        labelKey: xKey,
        labelByAxisValue: null,
      };
    }

    const seen = new Map<string, number>();
    const labelByAxisValue = new Map<string, string>();
    const next = data.map((row) => {
      const raw = safeLabel((row as Record<string, unknown>)[xKey]).trim();
      const idx = (seen.get(raw) ?? 0) + 1;
      seen.set(raw, idx);
      const axisValue = `${raw}__${idx}`;
      labelByAxisValue.set(axisValue, raw);
      return {
        ...(row as Record<string, unknown>),
        [INTERNAL_CATEGORY_KEY]: axisValue,
        [INTERNAL_CATEGORY_LABEL]: raw,
      };
    });

    return {
      data: next,
      axisKey: INTERNAL_CATEGORY_KEY,
      labelKey: INTERNAL_CATEGORY_LABEL,
      labelByAxisValue,
    };
  }, [data, xKey]);

  const tooltipLabelFormatterSafe = React.useCallback(
    (_value: unknown, payload: unknown[]) => {
      const first = payload?.[0] as { payload?: Record<string, unknown> } | undefined;
      const labelValue = first?.payload?.[prepared.labelKey];
      return labelValue === null || labelValue === undefined ? "" : String(labelValue);
    },
    [prepared.labelKey],
  );

  const getChartSvgElement = React.useCallback(() => {
    const root = rootRef.current;
    if (!root) return null;

    const chartRoot = root.querySelector('[data-slot="chart"]') as HTMLElement | null;
    if (!chartRoot) return null;

    const rechartsSvg = chartRoot.querySelector("svg.recharts-surface") as SVGSVGElement | null;
    if (rechartsSvg) return rechartsSvg;

    const svgCandidates = Array.from(chartRoot.querySelectorAll("svg")) as SVGSVGElement[];
    return (
      svgCandidates
        .map((svg) => ({ svg, rect: svg.getBoundingClientRect() }))
        .filter((item) => item.rect.width > 0 && item.rect.height > 0)
        .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0]?.svg ?? null
    );
  }, []);

  const downloadPng = React.useCallback(async () => {
    if (downloading) return;
    const root = rootRef.current;
    if (!root) return;

    const svgEl = getChartSvgElement();
    if (!svgEl) return;

    setDownloading(true);
    let svgUrl: string | null = null;
    let downloadUrl: string | null = null;
    try {
      const rect = svgEl.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const heightPx = Math.max(1, Math.round(rect.height));

      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(width));
      clone.setAttribute("height", String(heightPx));

      if (!clone.getAttribute("viewBox")) {
        clone.setAttribute("viewBox", `0 0 ${width} ${heightPx}`);
      }

      const backgroundColor = (() => {
        const rootBg = getComputedStyle(root).backgroundColor;
        if (rootBg && rootBg !== "rgba(0, 0, 0, 0)" && rootBg !== "transparent") return rootBg;
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        return bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent" ? bodyBg : "#ffffff";
      })();

      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("x", "0");
      bg.setAttribute("y", "0");
      bg.setAttribute("width", "100%");
      bg.setAttribute("height", "100%");
      bg.setAttribute("fill", backgroundColor);
      clone.insertBefore(bg, clone.firstChild);

      const computedSvg = getComputedStyle(svgEl);

      const resolveCssVar = (name: string) => {
        let current = name;
        for (let depth = 0; depth < 5; depth += 1) {
          if (!current.startsWith("--")) return current;
          const raw = computedSvg.getPropertyValue(current).trim();
          if (!raw) return "";
          const match = raw.match(/^var\((--[^)]+)\)$/);
          if (match?.[1]) {
            current = match[1];
            continue;
          }
          return raw;
        }
        return "";
      };

      const resolveFillOrStroke = (value: string) => {
        const varMatch = value.match(/^var\((--[^)]+)\)$/);
        if (!varMatch?.[1]) return resolveCssColorToRgb(value);
        const resolved = resolveCssVar(varMatch[1]);
        return resolved ? resolveCssColorToRgb(resolved) : resolveCssColorToRgb(value);
      };

      clone.querySelectorAll("[fill]").forEach((node) => {
        const el = node as SVGElement;
        const value = el.getAttribute("fill");
        if (!value) return;
        if (!value.startsWith("var(")) return;
        el.setAttribute("fill", resolveFillOrStroke(value));
      });
      clone.querySelectorAll("[stroke]").forEach((node) => {
        const el = node as SVGElement;
        const value = el.getAttribute("stroke");
        if (!value) return;
        if (!value.startsWith("var(")) return;
        el.setAttribute("stroke", resolveFillOrStroke(value));
      });

      const applyComputedAttr = (selector: string, attr: string, cssProp: keyof CSSStyleDeclaration) => {
        const sample = svgEl.querySelector(selector) as SVGElement | null;
        if (!sample) return;
        const computed = getComputedStyle(sample as unknown as Element)[cssProp] as unknown as string;
        if (!computed) return;
        clone.querySelectorAll(selector).forEach((node) => {
          (node as SVGElement).setAttribute(attr, computed);
        });
      };

      applyComputedAttr(".recharts-cartesian-axis-tick text", "fill", "fill");
      applyComputedAttr(".recharts-cartesian-grid line", "stroke", "stroke");
      applyComputedAttr(".recharts-cartesian-axis-line", "stroke", "stroke");

      const serialized = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      const imgLoaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar SVG."));
      });
      img.src = svgUrl;
      await imgLoaded;

      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      const canvas = document.createElement("canvas");
      canvas.width = width * dpr;
      canvas.height = heightPx * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, heightPx);
      ctx.drawImage(img, 0, 0, width, heightPx);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${downloadFileName}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      setDownloading(false);
    }
  }, [downloadFileName, downloading, getChartSvgElement, resolveCssColorToRgb]);

  const downloadCsv = React.useCallback(() => {
    const headers = [xKey, ...series.map((s) => s.label)];
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      const needsQuotes = /[",\n;]/.test(text);
      const normalized = text.replaceAll("\"", "\"\"");
      return needsQuotes ? `"${normalized}"` : normalized;
    };

    const lines = [
      headers.map((h) => escape(h)).join(";"),
      ...data.map((row) => {
        const x = (row as Record<string, unknown>)[xKey];
        const values = series.map((s) => (row as Record<string, unknown>)[s.key]);
        return [x, ...values].map(escape).join(";");
      }),
    ];

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${downloadFileName}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [data, downloadFileName, series, xKey]);

  const openReportWindow = React.useCallback(() => {
    const svgEl = getChartSvgElement();
    if (!svgEl) return;

    const title = downloadFileName;
    const safeTitle = title.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const serialized = new XMLSerializer().serializeToString(svgEl);

    const rowsHtml = data
      .map((row) => {
        const x = (row as Record<string, unknown>)[xKey];
        const cells = series
          .map((s) => {
            const value = (row as Record<string, unknown>)[s.key];
            return `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">${formatValue(value)}</td>`;
          })
          .join("");
        return `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${String(x ?? "")}</td>${cells}</tr>`;
      })
      .join("");

    const headerCells = series
      .map(
        (s) =>
          `<th style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">${s.label}</th>`,
      )
      .join("");

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; color: #111827; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .chart { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th { text-align: left; color: #6b7280; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <div class="chart">${serialized}</div>
  <table>
    <thead>
      <tr>
        <th style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${String(xKey)}</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }, [data, downloadFileName, formatValue, getChartSvgElement, series, xKey]);

  const isPie = chartType === "pie" || chartType === "donut";
  const isHorizontalBar = chartType === "bar_horizontal";
  const gridStroke = resolveCssColorToRgb("var(--border)");
  const xAxisAngle = React.useMemo(() => (data.length > 10 ? -30 : 0), [data.length]);
  const xAxisTextAnchor = React.useMemo(() => (data.length > 10 ? "end" : "middle"), [data.length]);
  const pieColors = [
    resolveCssColorToRgb("var(--chart-1)"),
    resolveCssColorToRgb("var(--chart-2)"),
    resolveCssColorToRgb("var(--chart-3)"),
    resolveCssColorToRgb("var(--chart-4)"),
    resolveCssColorToRgb("var(--chart-5)"),
  ];
  const tickFill = React.useMemo(() => resolveCssColorToRgb("var(--foreground)"), [resolveCssColorToRgb]);

  const xTickMaxLen = React.useMemo(() => (data.length > 10 ? 12 : 18), [data.length]);
  const yCategoryMaxLen = React.useMemo(() => 28, []);

  const yCategoryWidth = React.useMemo(() => {
    if (!isHorizontalBar) return 120;
    const labels = prepared.data.map((row) => row[prepared.labelKey]);
    const longest = labels.reduce<number>(
      (acc, value) => Math.max(acc, safeLabel(value).trim().length),
      0,
    );
    const px = Math.round(Math.min(260, Math.max(140, longest * 6.8 + 26)));
    return px;
  }, [isHorizontalBar, prepared.data, prepared.labelKey]);

  const yAxisWidth = React.useMemo(() => 80, []);

  const chartHeight = React.useMemo(() => {
    if (chartType === "bar_horizontal") {
      const needed = prepared.data.length * 54 + 180;
      return Math.max(safeHeight, needed);
    }
    return safeHeight;
  }, [chartType, prepared.data.length, safeHeight]);

  if (!data.length) {
    return (
      <ModuleEmptyState title="Sem dados" description={emptyState} />
    );
  }

  if (!series.length) {
    return (
      <ModuleEmptyState
        title="Sem metricas"
        description="Selecione ao menos uma metrica."
      />
    );
  }

  const primarySeries = series[0]!;

  return (
    <div
      ref={rootRef}
      className={cn(MODULE_SURFACE_CLASS_NAME, "relative w-full p-3", className)}
    >
      <div className="absolute right-3 top-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Exportar"
              aria-label="Exportar"
              disabled={downloading}
            >
              <Download className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={downloadPng}>Baixar PNG</DropdownMenuItem>
            <DropdownMenuItem onClick={downloadCsv}>Baixar CSV</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openReportWindow}>Abrir relatório</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChartContainer
        config={config}
        className="w-full aspect-auto pt-6"
        style={{ height: chartHeight }}
      >
        {isPie ? (
          <PieChartView
            data={prepared.data}
            valueKey={primarySeries.key}
            nameKey={prepared.labelKey}
            colors={pieColors}
            isDonut={chartType === "donut"}
            tooltipLabelFormatter={tooltipLabelFormatterSafe}
            formatValue={formatValue}
          />
        ) : chartType === "line" ? (
          <LineChartView
            data={prepared.data}
            axisKey={prepared.axisKey}
            labelByAxisValue={prepared.labelByAxisValue}
            gridStroke={gridStroke}
            tickFill={tickFill}
            xAxisAngle={xAxisAngle}
            xAxisTextAnchor={xAxisTextAnchor}
            xTickMaxLen={xTickMaxLen}
            series={resolvedSeries.map((s) => ({
              key: s.key,
              color: s.resolvedColor,
              label: s.label,
            }))}
            formatValue={formatValue}
            tooltipLabelFormatter={tooltipLabelFormatterSafe}
          />
        ) : chartType === "area" ? (
          <AreaChartView
            data={prepared.data}
            axisKey={prepared.axisKey}
            labelByAxisValue={prepared.labelByAxisValue}
            gridStroke={gridStroke}
            tickFill={tickFill}
            xAxisAngle={xAxisAngle}
            xAxisTextAnchor={xAxisTextAnchor}
            xTickMaxLen={xTickMaxLen}
            series={resolvedSeries.map((s) => ({ key: s.key, color: s.resolvedColor }))}
            formatValue={formatValue}
            tooltipLabelFormatter={tooltipLabelFormatterSafe}
          />
        ) : (
          <BarChartView
            data={prepared.data}
            axisKey={prepared.axisKey}
            labelByAxisValue={prepared.labelByAxisValue}
            isHorizontal={isHorizontalBar}
            gridStroke={gridStroke}
            tickFill={tickFill}
            xAxisAngle={xAxisAngle}
            xAxisTextAnchor={xAxisTextAnchor}
            xTickMaxLen={xTickMaxLen}
            yCategoryMaxLen={yCategoryMaxLen}
            yCategoryWidth={yCategoryWidth}
            yAxisWidth={yAxisWidth}
            series={resolvedSeries.map((s) => ({
              key: s.key,
              color: s.resolvedColor,
              label: s.label,
            }))}
            formatValue={formatValue}
            tooltipLabelFormatter={tooltipLabelFormatterSafe}
          />
        )}
      </ChartContainer>
    </div>
  );
}
