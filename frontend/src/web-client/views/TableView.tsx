"use client";

import * as React from "react";
import type { ColumnDef, ColumnPinningState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ListView } from "@/web-client/views/ListView";

export function TableView<TData>({
  data,
  columns,
  onRowClick,
  className,
  getRowId,
  minWidthClassName = "min-w-[860px]",
  initialColumnPinning,
}: {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  onRowClick?: (row: TData) => void;
  className?: string;
  getRowId?: (row: TData, index: number) => string;
  minWidthClassName?: string;
  initialColumnPinning?: ColumnPinningState;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div className={cn(minWidthClassName)}>
        <ListView
          data={data}
          columns={columns}
          onRowClick={onRowClick}
          getRowId={getRowId}
          initialColumnPinning={initialColumnPinning}
        />
      </div>
    </div>
  );
}
