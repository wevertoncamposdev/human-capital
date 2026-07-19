"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

type SectionListProps = {
  children: ReactNode;
  className?: string;
};

type SectionListItemProps = {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  showActionsOnHover?: boolean;
  inlineActions?: boolean;
  onClick?: () => void;
  className?: string;
  actionsClassName?: string;
};

export function SectionList({ children, className }: SectionListProps) {
  return <div className={clsx("space-y-1", className)}>{children}</div>;
}

export function SectionListItem({
  leading,
  title,
  subtitle,
  meta,
  actions,
  showActionsOnHover = true,
  inlineActions = false,
  onClick,
  className,
  actionsClassName,
}: SectionListItemProps) {
  const actionBase = inlineActions
    ? "ml-2 flex shrink-0 items-center gap-1"
    : "absolute right-0 top-1 flex items-center gap-1";
  const actionVisibility = showActionsOnHover
    ? "opacity-0 transition-opacity duration-200 group-hover:opacity-100"
    : "opacity-100";
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        "group relative flex flex-col gap-2 border-b border-border/30 py-1.5 pr-2 lg:flex-row lg:items-center",
        onClick
          ? "cursor-pointer rounded-md px-2 -mx-2 outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/30"
          : null,
        className,
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
          {title}
        </div>
        {subtitle ? (
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        ) : null}
        {meta ? (
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div
          className={clsx(
            actionBase,
            "text-muted-foreground",
            actionVisibility,
            actionsClassName,
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export type { SectionListProps, SectionListItemProps };
