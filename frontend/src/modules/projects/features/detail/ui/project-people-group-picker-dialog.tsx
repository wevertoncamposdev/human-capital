"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionDialog } from "@/components/section-dialog";
import { listPeopleGroups } from "@/modules/people-groups/api/people-groups";
import type { ApiPeopleGroup } from "@/modules/people-groups/api";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { TableView } from "@/web-client/views/TableView";

type ProjectPeopleGroupPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  purpose: "PUBLICO" | "EQUIPE";
  title?: string;
  actionLabel?: string;
  onPick: (peopleGroup: ApiPeopleGroup) => void;
};

function formatAgeRange(ageMin: number | null | undefined, ageMax: number | null | undefined) {
  if (ageMin == null && ageMax == null) return "Livre";
  return `${ageMin ?? "-"} a ${ageMax ?? "-"}`;
}

export function ProjectPeopleGroupPickerDialog({
  open,
  onOpenChange,
  token,
  purpose,
  title,
  actionLabel,
  onPick,
}: ProjectPeopleGroupPickerDialogProps) {
  const [rows, setRows] = React.useState<ApiPeopleGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = React.useState("");

  const resolvedTitle =
    title ?? (purpose === "EQUIPE" ? "Vincular grupo de equipe" : "Vincular grupo de pessoas");
  const resolvedActionLabel = actionLabel ?? "Vincular";

  const columns = React.useMemo<ColumnDef<ApiPeopleGroup>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Grupo institucional",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">{row.original.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.original.description?.trim() || "Sem descricao"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "purpose",
        header: "Finalidade",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.purpose === "EQUIPE" ? "Equipe" : "Publico"}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Categoria",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.category?.trim() || "-"}
          </span>
        ),
      },
      {
        id: "ageRange",
        header: "Faixa etaria",
        accessorFn: (row) => formatAgeRange(row.ageMin, row.ageMax),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatAgeRange(row.original.ageMin, row.original.ageMax)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-none border-b border-border/60 px-1"
              onClick={(event) => {
                event.stopPropagation();
                onPick(row.original);
              }}
            >
              {resolvedActionLabel}
            </Button>
          </div>
        ),
      },
    ],
    [onPick, resolvedActionLabel],
  );

  const load = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listPeopleGroups(token, {
        q: search.trim() || undefined,
        purpose,
        isActive: true,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      });
      setRows(response.data);
      setTotalCount(response.pagination.total);
      setPageCount(response.pagination.pages);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar grupos de pessoas.";
      setError(message);
      setRows([]);
      setPageCount(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [open, pagination.pageIndex, pagination.pageSize, purpose, search, token]);

  React.useEffect(() => {
    if (!open) return;
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }, [open, search]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={resolvedTitle}
      contentClassName="max-w-[980px]"
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar"
            className="h-9 rounded-none border-x-0 border-t-0 border-border/70 pl-6 pr-14 text-sm shadow-none focus-visible:ring-0"
          />
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-muted-foreground">
            {totalCount.toLocaleString("pt-BR")}
          </span>
        </div>

        <TableView
          data={rows}
          columns={columns}
          onRowClick={(row) => {
            onPick(row);
          }}
        />

        <PaginationBar
          pageIndex={pagination.pageIndex}
          pageCount={pageCount}
          pageSize={pagination.pageSize}
          onPageIndexChange={(next) =>
            setPagination((previous) => ({ ...previous, pageIndex: next }))
          }
          onPageSizeChange={(next) => setPagination({ pageIndex: 0, pageSize: next })}
          disabled={loading}
        />
      </div>

      {loading ? <p className="text-xs text-muted-foreground">Carregando...</p> : null}
    </SectionDialog>
  );
}
