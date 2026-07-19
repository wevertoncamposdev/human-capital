"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
};

export function SectionCard({
  title,
  subtitle,
  actions,
  footer,
  children,
  className,
  contentClassName,
  headerClassName,
  collapsible = false,
  defaultOpen = true,
  onToggleOpen,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;
  const actionContent = useMemo(() => {
    if (!actions && !collapsible) return null;
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {actions}
        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() =>
              setOpen((prev) => {
                const next = !prev;
                onToggleOpen?.(next);
                return next;
              })
            }
            aria-label={isOpen ? "Recolher" : "Expandir"}
            title={isOpen ? "Recolher" : "Expandir"}
          >
            {isOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        ) : null}
      </div>
    );
  }, [actions, collapsible, isOpen, onToggleOpen]);

  return (
    <Card className={clsx("border-border/60 shadow-none", className)}>
      <CardHeader
        className={clsx("border-b border-border/50", headerClassName)}
      >
        <div className="">
          <CardTitle className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </CardTitle>
          {subtitle ? (
            <CardDescription className="text-[11px] tracking-[0.1em] text-muted-foreground">
              {subtitle}
            </CardDescription>
          ) : null}
        </div>
        {actionContent ? <CardAction>{actionContent}</CardAction> : null}
      </CardHeader>
      {isOpen ? (
        <CardContent
          className={clsx(
            "space-y-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5",
            contentClassName,
          )}
        >
          {children}
        </CardContent>
      ) : null}
      {isOpen && footer ? (
        <div className="border-t border-border/40 px-4 py-3 sm:px-5">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

export type { SectionCardProps };
