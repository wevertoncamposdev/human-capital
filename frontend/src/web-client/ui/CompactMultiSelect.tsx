"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type CompactMultiSelectOption = {
  value: string;
  label: string;
  description?: string | null;
};

type CompactMultiSelectProps = {
  options: CompactMultiSelectOption[];
  selectedValues: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
};

export function CompactMultiSelect({
  options,
  selectedValues,
  onChange,
  disabled = false,
  label = "Selecionar itens",
  placeholder = "Selecionar",
  emptyLabel = "Nenhum item selecionado.",
  className,
}: CompactMultiSelectProps) {
  const selected = React.useMemo(
    () => options.filter((option) => selectedValues.includes(option.value)),
    [options, selectedValues],
  );

  const summary = React.useMemo(() => {
    if (!selected.length) return placeholder;
    if (selected.length <= 2) {
      return selected.map((item) => item.label).join(", ");
    }
    return `${selected.length} selecionados`;
  }, [placeholder, selected]);

  return (
    <div className={cn("space-y-2", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-10 w-full justify-between rounded-none border-0 border-b border-border/60 px-0 text-left shadow-none hover:bg-transparent",
              disabled && "opacity-60",
            )}
          >
            <span className="truncate text-sm text-foreground">{summary}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[22rem] max-w-[calc(100vw-2rem)]">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.length ? (
            options.map((option) => {
              const checked = selectedValues.includes(option.value);
              return (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={checked}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(nextChecked) => {
                    const next = nextChecked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((entry) => entry !== option.value);
                    onChange(Array.from(new Set(next)));
                  }}
                  className="items-start py-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm text-foreground">{option.label}</div>
                    {option.description?.trim() ? (
                      <div className="text-[11px] text-muted-foreground">
                        {option.description}
                      </div>
                    ) : null}
                  </div>
                </DropdownMenuCheckboxItem>
              );
            })
          ) : (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Nenhum perfil disponivel.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <Badge
              key={option.value}
              variant="outline"
              className="gap-1 rounded-full border-border/60 px-2 text-[10px]"
            >
              <Check className="size-3" />
              {option.label}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">{emptyLabel}</div>
      )}
    </div>
  );
}
