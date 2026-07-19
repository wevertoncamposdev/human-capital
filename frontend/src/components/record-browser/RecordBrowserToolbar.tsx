"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  RecordBrowserViewSwitcher,
  type RecordBrowserViewOption,
} from "@/components/record-browser/RecordBrowserViewSwitcher";

export function RecordBrowserToolbar<V extends string>({
  view,
  views,
  onViewChange,
  query,
  onQueryChange,
  searchPlaceholder = "Pesquisar...",
  leftActions,
  filters,
  rightActions,
  className,
}: {
  view: V;
  views: RecordBrowserViewOption<V>[];
  onViewChange: (next: V) => void;
  query: string;
  onQueryChange: (next: string) => void;
  searchPlaceholder?: string;
  leftActions?: React.ReactNode;
  filters?: React.ReactNode;
  rightActions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-end", className)}>
      {leftActions ? (
        <div className="flex flex-wrap items-center gap-2">{leftActions}</div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-end">
        <div className="min-w-[240px] flex-1">
          <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Buscar
          </p>
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        {filters ? <div className="flex flex-wrap items-end gap-2">{filters}</div> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
        {rightActions ? <div className="flex flex-wrap items-center gap-2">{rightActions}</div> : null}
        <RecordBrowserViewSwitcher value={view} options={views} onChange={onViewChange} />
      </div>
    </div>
  );
}

