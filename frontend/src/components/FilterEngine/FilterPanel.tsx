"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FilterEngine } from "@/components/FilterEngine/FilterEngine";
import type { FilterSchema } from "@/lib/filters/types";
import { cn } from "@/lib/utils";

export function FilterPanel<TValues extends Record<string, unknown>>({
  title = "Filtros",
  description,
  schema,
  value,
  onChange,
  onApply,
  onClear,
  applyLabel = "Aplicar",
  clearLabel = "Limpar",
  columns = 2,
  actionsDisabled,
  className,
}: {
  title?: string;
  description?: string;
  schema: FilterSchema<TValues>;
  value: TValues;
  onChange: (next: TValues) => void;
  onApply: () => void;
  onClear: () => void;
  applyLabel?: string;
  clearLabel?: string;
  columns?: 1 | 2 | 3 | 4;
  actionsDisabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <div className="mb-3">
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <FilterEngine
        schema={schema}
        value={value}
        onChange={onChange}
        columns={columns}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onApply} disabled={actionsDisabled}>
          {applyLabel}
        </Button>
        <Button variant="outline" onClick={onClear} disabled={actionsDisabled}>
          {clearLabel}
        </Button>
      </div>
    </div>
  );
}
