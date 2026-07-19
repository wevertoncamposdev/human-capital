"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PaginationBar({
  pageIndex,
  pageCount,
  pageSize,
  onPageIndexChange,
  onPageSizeChange,
  disabled = false,
}: {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  onPageIndexChange: (next: number) => void;
  onPageSizeChange: (next: number) => void;
  disabled?: boolean;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-border/60 bg-background px-4 py-3 text-xs">
      <div className="text-muted-foreground">
        Pagina{" "}
        <span className="font-mono tabular-nums text-foreground">{pageIndex + 1}</span>{" "}
        de <span className="font-mono tabular-nums text-foreground">{pageCount}</span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
          disabled={disabled || pageIndex <= 0}
          aria-label="Página anterior"
          title="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[128px] rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus:ring-0">
            <List className="mr-2 size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => onPageIndexChange(Math.min(pageCount - 1, pageIndex + 1))}
          disabled={disabled || pageIndex + 1 >= pageCount}
          aria-label="Próxima página"
          title="Próxima página"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div />
    </div>
  );
}

