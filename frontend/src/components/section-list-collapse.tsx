"use client";

import * as React from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

type SectionListCollapseProps = {
  title: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  actions?: ReactNode;
  showActionsOnHover?: boolean;
  toggleOnTitle?: boolean;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function SectionListCollapse({
  title,
  count,
  defaultOpen = false,
  actions,
  showActionsOnHover = true,
  toggleOnTitle = true,
  children,
  className,
  headerClassName,
  contentClassName,
}: SectionListCollapseProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div
      className={clsx(
        "group border-b border-border/30 py-1.5 pr-2",
        className,
      )}
    >
      <div
        className={clsx("flex items-center justify-between gap-2", headerClassName)}
      >
        {toggleOnTitle ? (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex flex-1 items-center gap-2 text-left text-xs font-semibold text-foreground"
          >
            <span className="text-sm leading-tight">{title}</span>
            {typeof count === "number" ? (
              <Badge variant="outline" className="text-[10px]">
                {count}
              </Badge>
            ) : null}
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-2 text-left text-xs font-semibold text-foreground">
            <span className="text-sm leading-tight">{title}</span>
            {typeof count === "number" ? (
              <Badge variant="outline" className="text-[10px]">
                {count}
              </Badge>
            ) : null}
          </div>
        )}
        <div className="flex items-center gap-1">
          {actions ? (
            <div
              onClick={(event) => event.stopPropagation()}
              className={clsx(
                showActionsOnHover
                  ? "opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  : "opacity-100",
              )}
            >
              {actions}
            </div>
          ) : null}
          <button
            type="button"
            className="text-muted-foreground"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Ocultar" : "Mostrar"}
          >
            {open ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>
      </div>
      {open ? (
        <div
          className={clsx(
            "mt-2 space-y-1 border-t border-border/30 pt-2",
            contentClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export type { SectionListCollapseProps };
