"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ModuleEmptyState } from "@/web-client/ui/ModulePrimitives";

type Column<TItem> = {
  key: string;
  label: string;
  items: TItem[];
};

export function KanbanView<TItem>({
  items,
  getColumnKey,
  getColumnLabel,
  columnOrder,
  renderCard,
  className,
  emptyState = "Nenhum registro.",
}: {
  items: TItem[];
  getColumnKey?: (item: TItem) => string;
  getColumnLabel?: (key: string) => string;
  columnOrder?: string[];
  renderCard: (item: TItem) => React.ReactNode;
  className?: string;
  emptyState?: string;
}) {
  const columns = React.useMemo<Column<TItem>[]>(() => {
    if (!getColumnKey) {
      return [{ key: "__all__", label: "", items }];
    }

    const map = new Map<string, TItem[]>();
    items.forEach((item) => {
      const key = getColumnKey(item) || "__empty__";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    });

    const keys = columnOrder?.length ? columnOrder : Array.from(map.keys()).sort();
    return keys
      .map((key) => ({
        key,
        label: getColumnLabel ? getColumnLabel(key) : key,
        items: map.get(key) ?? [],
      }))
      .filter((col) => col.items.length || col.key === "__empty__" || col.key === "__all__");
  }, [columnOrder, getColumnKey, getColumnLabel, items]);

  if (!items.length) {
    return (
      <ModuleEmptyState title="Sem registros" description={emptyState} />
    );
  }

  const isGrouped = Boolean(getColumnKey);

  return (
    <div
      className={cn(
        isGrouped
          ? "flex gap-3 overflow-x-auto pb-2"
          : "grid gap-2 md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {columns.map((column) =>
        isGrouped ? (
          <div
            key={column.key}
            className="min-w-[18rem] max-w-[20rem] shrink-0 overflow-hidden rounded-lg border border-border/60 bg-background/90"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/10 px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {column.label}
              </div>
              <div className="px-1 font-mono text-[11px] tabular-nums text-foreground">
                {column.items.length}
              </div>
            </div>
            <div className="grid gap-3 p-3">
              {column.items.length ? (
                column.items.map((item, index) => (
                  <div key={`${column.key}-${index}`}>{renderCard(item)}</div>
                ))
              ) : (
                <ModuleEmptyState
                  title={null}
                  description="Vazio"
                  compact
                  className="border border-dashed border-border/50"
                />
              )}
            </div>
          </div>
        ) : (
          <React.Fragment key={column.key}>
            {column.items.map((item, index) => (
              <div key={`${column.key}-${index}`}>{renderCard(item)}</div>
            ))}
          </React.Fragment>
        ),
      )}
    </div>
  );
}
