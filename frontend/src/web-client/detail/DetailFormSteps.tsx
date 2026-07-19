"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type DetailFormStep = {
  key: string;
  title: string;
  description?: React.ReactNode;
};

export function DetailFormSteps({
  steps,
  value,
  onValueChange,
  className,
}: {
  steps: DetailFormStep[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60">
        {steps.map((step, index) => {
          const isActive = step.key === value;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onValueChange(step.key)}
              className={cn(
                "group relative -mb-px rounded-none border-b-2 px-1 py-3 text-left transition-colors sm:px-3",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border/80 hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-full text-[10px]",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                  )}
                >
                  {index + 1}
                </span>
                {step.title}
              </div>
            </button>
          );
        })}
      </div>
      {steps.find((step) => step.key === value)?.description ? (
        <div className="text-xs text-muted-foreground">
          {steps.find((step) => step.key === value)?.description}
        </div>
      ) : null}
    </div>
  );
}
