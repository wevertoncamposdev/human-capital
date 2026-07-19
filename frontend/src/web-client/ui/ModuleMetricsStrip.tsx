"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ModuleMetricItem = {
  key: string;
  label: string;
  value: React.ReactNode;
  description?: string;
  tone?: "default" | "danger" | "warning" | "success" | "info";
  active?: boolean;
  onClick?: () => void;
};

const toneClassNames: Record<NonNullable<ModuleMetricItem["tone"]>, string> = {
  default: "border-border/60 bg-background text-foreground",
  danger: "border-rose-500/20 bg-rose-500/5 text-rose-700",
  warning: "border-amber-500/20 bg-amber-500/5 text-amber-800",
  success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-700",
  info: "border-sky-500/20 bg-sky-500/5 text-sky-700",
};

export function ModuleMetricsStrip({ items }: { items: ModuleMetricItem[] }) {
  if (!items.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const className = cn(
          "rounded-none border px-4 py-3 text-left transition-colors",
          toneClassNames[item.tone ?? "default"],
          item.onClick ? "hover:border-primary/40" : "",
          item.active ? "border-primary/50" : "",
        );

        const content = (
          <>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </div>
            <div className="pt-2 text-2xl font-semibold leading-none">{item.value}</div>
            {item.description ? (
              <div className="pt-2 text-xs text-muted-foreground">{item.description}</div>
            ) : null}
          </>
        );

        return item.onClick ? (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={className}
          >
            {content}
          </button>
        ) : (
          <div key={item.key} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
