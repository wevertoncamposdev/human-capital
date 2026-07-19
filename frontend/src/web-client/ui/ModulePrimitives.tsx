"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const MODULE_SURFACE_CLASS_NAME =
  "overflow-hidden rounded-lg border border-border/60 bg-background/90";

export const MODULE_MUTED_SURFACE_CLASS_NAME =
  "overflow-hidden rounded-lg border border-border/50 bg-muted/10";

export const MODULE_TABS_LIST_CLASS_NAME =
  "h-10 w-full justify-start gap-5 rounded-none border-0 border-b border-border/60 bg-transparent p-0";

export const MODULE_TAB_TRIGGER_CLASS_NAME =
  "h-10 rounded-none border-b-2 border-transparent bg-transparent px-0 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:hover:bg-transparent";

export function ModuleSurface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(MODULE_SURFACE_CLASS_NAME, className)}>{children}</div>;
}

export function ModuleSectionHeader({
  kicker,
  title,
  description,
  meta,
  actionSlot,
  className,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actionSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3",
        className,
      )}
    >
      <div className="min-w-0">
        {kicker ? (
          <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {kicker}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
          {meta ? (
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </div>
        {description ? (
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>

      {actionSlot ? <div className="shrink-0">{actionSlot}</div> : null}
    </div>
  );
}

export function ModuleEmptyState({
  title = "Sem registros",
  description,
  actionSlot,
  compact = false,
  className,
}: {
  title?: React.ReactNode;
  description: React.ReactNode;
  actionSlot?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 text-center",
        compact ? "py-8" : "min-h-[180px] py-10",
        className,
      )}
    >
      {title ? (
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div className="max-w-[28rem] text-sm text-muted-foreground">{description}</div>
      {actionSlot ? <div className="pt-1">{actionSlot}</div> : null}
    </div>
  );
}
