"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateOnlyPtBR } from "@/lib/date";
import type { ApiDepositEntry, ApiDepositExit, ApiDepositHistoryMovement } from "@/modules/deposit/api";
import type { DepositItemDetailMode } from "@/modules/deposit/features/items/domain/deposit-item-detail.types";
import { resolveExitTypeLabel } from "@/modules/deposit/features/items/domain/deposit-item-detail.helpers";
import { DEPOSIT_DEFAULT_SECTOR } from "@/modules/deposit/shared/domain/deposit.constants";
import { ListView } from "@/web-client/views/ListView";

function resolveKindLabel(kind: ApiDepositHistoryMovement["kind"]) {
  return kind === "ENTRY" ? "Entrada" : "Saída";
}

function dateCell(value: string | null | undefined) {
  if (!value) return "-";
  return formatDateOnlyPtBR(value);
}

export type DepositItemMovementsTabsProps = {
  mode: DepositItemDetailMode;
  readOnly: boolean;
  movementsLoading: boolean;
  entryRows: ApiDepositEntry[];
  exitRows: ApiDepositExit[];
  historyRows: ApiDepositHistoryMovement[];
  onNewEntry: () => void;
  onNewExit: () => void;
  onOpenEntry: (entryId: string) => void;
  onOpenExit: (exitId: string) => void;
};

export function DepositItemMovementsTabs({
  mode,
  readOnly,
  movementsLoading,
  entryRows,
  exitRows,
  historyRows,
  onNewEntry,
  onNewExit,
  onOpenEntry,
  onOpenExit,
}: DepositItemMovementsTabsProps) {
  const entryColumns = React.useMemo<ColumnDef<ApiDepositEntry>[]>(
    () => [
      {
        id: "entryDate",
        header: "Data",
        accessorKey: "entryDate",
        cell: ({ row }) => <div className="text-sm">{dateCell(row.original.entryDate)}</div>,
      },
      {
        id: "expiryDate",
        header: "Data limite",
        accessorKey: "expiryDate",
        cell: ({ row }) => <div className="text-sm">{dateCell(row.original.expiryDate)}</div>,
      },
      {
        id: "sector",
        header: "Setor",
        accessorKey: "sector",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.sector || DEPOSIT_DEFAULT_SECTOR}
          </div>
        ),
      },
      {
        id: "donorName",
        header: "Fonte",
        accessorFn: (row) => row.donor?.name ?? "",
        cell: ({ row }) => (
          <div className="truncate text-sm">
            {row.original.donor?.name ?? "Sem fonte"}
          </div>
        ),
      },
      {
        id: "quantity",
        header: "Quantidade",
        accessorFn: (row) => Number(row.quantity),
        cell: ({ row }) => (
          <div className="font-mono text-sm tabular-nums">
            {Number(row.original.quantity).toLocaleString("pt-BR")}
          </div>
        ),
      },
      {
        id: "unit",
        header: "Unid.",
        accessorKey: "unit",
        cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.unit}</div>,
      },
      {
        id: "notes",
        header: "Notas",
        accessorKey: "notes",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.notes ?? "-"}
          </div>
        ),
      },
    ],
    [],
  );

  const exitColumns = React.useMemo<ColumnDef<ApiDepositExit>[]>(
    () => [
      {
        id: "exitDate",
        header: "Data",
        accessorKey: "exitDate",
        cell: ({ row }) => <div className="text-sm">{dateCell(row.original.exitDate)}</div>,
      },
      {
        id: "sector",
        header: "Setor",
        accessorKey: "sector",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.sector || DEPOSIT_DEFAULT_SECTOR}
          </div>
        ),
      },
      {
        id: "type",
        header: "Tipo",
        accessorKey: "type",
        cell: ({ row }) => (
          <div className="text-sm">{resolveExitTypeLabel(row.original.type)}</div>
        ),
      },
      {
        id: "destinationName",
        header: "Destino",
        accessorKey: "destinationName",
        cell: ({ row }) => <div className="truncate text-sm">{row.original.destinationName ?? "-"}</div>,
      },
      {
        id: "allocations",
        header: "Lotes",
        accessorFn: (row) => row.allocations?.length ?? 0,
        cell: ({ row }) => {
          const count = row.original.allocations?.length ?? 0;
          return (
            <div className="text-sm text-muted-foreground">
              {count ? `${count} lote${count > 1 ? "s" : ""}` : "Automático"}
            </div>
          );
        },
      },
      {
        id: "quantity",
        header: "Quantidade",
        accessorFn: (row) => Number(row.quantity),
        cell: ({ row }) => (
          <div className="font-mono text-sm tabular-nums">
            {Number(row.original.quantity).toLocaleString("pt-BR")}
          </div>
        ),
      },
      {
        id: "unit",
        header: "Unid.",
        accessorKey: "unit",
        cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.unit}</div>,
      },
      {
        id: "notes",
        header: "Notas",
        accessorKey: "notes",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.notes ?? "-"}
          </div>
        ),
      },
    ],
    [],
  );

  const historyColumns = React.useMemo<ColumnDef<ApiDepositHistoryMovement>[]>(
    () => [
      {
        id: "kind",
        header: "Movimento",
        accessorKey: "kind",
        cell: ({ row }) => (
          <Badge
            className={
              row.original.kind === "ENTRY"
                ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                : "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200"
            }
          >
            {resolveKindLabel(row.original.kind)}
          </Badge>
        ),
      },
      {
        id: "movementDate",
        header: "Data",
        accessorKey: "movementDate",
        cell: ({ row }) => <div className="text-sm">{dateCell(row.original.movementDate)}</div>,
      },
      {
        id: "sector",
        header: "Setor",
        accessorKey: "sector",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.sector || DEPOSIT_DEFAULT_SECTOR}
          </div>
        ),
      },
      {
        id: "quantity",
        header: "Quantidade",
        accessorFn: (row) => Number(row.quantity),
        cell: ({ row }) => (
          <div className="font-mono text-sm tabular-nums">
            {Number(row.original.quantity).toLocaleString("pt-BR")}{" "}
            <span className="text-muted-foreground">{row.original.unit}</span>
          </div>
        ),
      },
      {
        id: "expiryDate",
        header: "Data limite",
        accessorKey: "expiryDate",
        cell: ({ row }) => <div className="text-sm">{dateCell(row.original.expiryDate)}</div>,
      },
      {
        id: "donorName",
        header: "Fonte",
        accessorKey: "donorName",
        cell: ({ row }) => (
          <div className="truncate text-sm">
            {row.original.kind === "ENTRY" ? row.original.donorName ?? "-" : "-"}
          </div>
        ),
      },
      {
        id: "type",
        header: "Tipo de saída",
        accessorKey: "type",
        cell: ({ row }) => (
          <div className="truncate text-sm">
            {row.original.kind === "EXIT" && row.original.type
              ? resolveExitTypeLabel(row.original.type)
              : "-"}
          </div>
        ),
      },
      {
        id: "destinationName",
        header: "Destino",
        accessorKey: "destinationName",
        cell: ({ row }) => (
          <div className="truncate text-sm">
            {row.original.kind === "EXIT" ? row.original.destinationName ?? "-" : "-"}
          </div>
        ),
      },
      {
        id: "actor",
        header: "Usuário",
        accessorKey: "actor",
        cell: ({ row }) => <div className="truncate text-sm">{row.original.actor}</div>,
      },
      {
        id: "notes",
        header: "Notas",
        accessorKey: "notes",
        cell: ({ row }) => (
          <div className="truncate text-sm text-muted-foreground">
            {row.original.notes ?? "-"}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="pt-3">
      <Tabs defaultValue="entries">
        <TabsList className="h-9 w-full justify-start gap-4 rounded-none border-0 border-b border-border/60 bg-transparent p-0">
          <TabsTrigger
            value="entries"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 text-xs text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:hover:bg-transparent"
          >
            Entradas
          </TabsTrigger>
          <TabsTrigger
            value="exits"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 text-xs text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:hover:bg-transparent"
          >
            Saídas
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none border-b-2 border-transparent bg-transparent px-0 text-xs text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:hover:bg-transparent"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-3 space-y-3">
          {mode !== "edit" ? (
            <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              Salve o objeto para registrar entradas.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end">
                <Button type="button" size="sm" onClick={onNewEntry} disabled={readOnly}>
                  <Plus className="mr-1 size-4" />
                  Nova entrada
                </Button>
              </div>

              {movementsLoading ? (
                <div className="text-sm text-muted-foreground">Carregando…</div>
              ) : entryRows.length ? (
                <ListView<ApiDepositEntry>
                  data={entryRows}
                  columns={entryColumns}
                  groupByFields={[]}
                  getRowId={(row) => row.id}
                  onRowClick={(row) => onOpenEntry(row.id)}
                />
              ) : (
                <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                  Sem entradas.
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="exits" className="mt-3 space-y-3">
          {mode !== "edit" ? (
            <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              Salve o objeto para registrar saídas.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end">
                <Button type="button" size="sm" onClick={onNewExit} disabled={readOnly}>
                  <Plus className="mr-1 size-4" />
                  Nova saída
                </Button>
              </div>

              {movementsLoading ? (
                <div className="text-sm text-muted-foreground">Carregando…</div>
              ) : exitRows.length ? (
                <ListView<ApiDepositExit>
                  data={exitRows}
                  columns={exitColumns}
                  groupByFields={[]}
                  getRowId={(row) => row.id}
                  onRowClick={(row) => onOpenExit(row.id)}
                />
              ) : (
                <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                  Sem saídas.
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-3 space-y-3">
          {mode !== "edit" ? (
            <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              Salve o objeto para ver o histórico.
            </div>
          ) : movementsLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : historyRows.length ? (
            <ListView<ApiDepositHistoryMovement>
              data={historyRows}
              columns={historyColumns}
              groupByFields={[]}
              getRowId={(row) => row.id}
              onRowClick={(row) => (row.kind === "ENTRY" ? onOpenEntry(row.id) : onOpenExit(row.id))}
            />
          ) : (
            <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              Sem histórico.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

