"use client";

import * as React from "react";
import {
  ModuleEmptyState,
  ModuleSurface,
} from "@/web-client/ui/ModulePrimitives";

function formatDateLabel(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${d}/${m}/${y}`;
}

export function TimelineView<TItem>({
  items,
  getDate,
  renderTitle,
  renderBody,
  sortDirection = "desc",
  className,
  emptyState = "Nada para exibir.",
}: {
  items: TItem[];
  getDate: (item: TItem) => Date | null;
  renderTitle: (item: TItem) => React.ReactNode;
  renderBody?: (item: TItem) => React.ReactNode;
  sortDirection?: "asc" | "desc";
  className?: string;
  emptyState?: string;
}) {
  const normalized = React.useMemo(() => {
    return items
      .map((item) => ({ item, date: getDate(item) }))
      .filter((x): x is { item: TItem; date: Date } => Boolean(x.date))
      .sort((a, b) =>
        sortDirection === "asc"
          ? a.date.getTime() - b.date.getTime()
          : b.date.getTime() - a.date.getTime(),
      );
  }, [getDate, items, sortDirection]);

  if (!normalized.length) {
    return (
      <ModuleEmptyState title="Sem registros" description={emptyState} />
    );
  }

  return (
    <ModuleSurface className={className}>
      <div className="divide-y divide-border/60">
        {normalized.map(({ item, date }, index) => (
          <div key={index} className="flex gap-4 px-4 py-4">
            <div className="flex w-[6.5rem] shrink-0 flex-col items-end">
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {formatDateLabel(date)}
              </div>
            </div>

            <div className="relative flex min-w-0 flex-1 gap-3">
              <div className="relative mt-1">
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border/60" />
                <div className="relative size-2 rounded-full bg-primary" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {renderTitle(item)}
                </div>
                {renderBody ? (
                  <div className="text-[13px] text-muted-foreground">{renderBody(item)}</div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ModuleSurface>
  );
}
