"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type RecordBrowserViewOption<V extends string> = {
  value: V;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export function RecordBrowserViewSwitcher<V extends string>({
  value,
  options,
  onChange,
  className,
  size = "sm",
  showLabels = false,
}: {
  value: V;
  options: RecordBrowserViewOption<V>[];
  onChange: (next: V) => void;
  className?: string;
  size?: "sm" | "md";
  showLabels?: boolean;
}) {
  const itemClassName =
    size === "sm" ? "h-8 px-2 text-xs gap-1" : "h-9 px-3 text-sm gap-2";

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (!next) return;
        onChange(next as V);
      }}
      className={cn(
        "shrink-0 items-center gap-0 border-b border-border/60",
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          title={option.label}
          aria-label={option.label}
          className={cn(
            "rounded-none border-b-2 border-transparent bg-transparent px-2 text-muted-foreground shadow-none",
            "data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:shadow-none",
            "hover:bg-transparent hover:text-foreground",
            itemClassName,
          )}
        >
          {option.icon ? (
            <span className="text-current">{option.icon}</span>
          ) : null}
          <span
            className={cn(
              option.icon ? (showLabels ? "hidden sm:inline" : "sr-only") : "",
            )}
          >
            {option.label}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
