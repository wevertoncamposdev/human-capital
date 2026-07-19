"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useDetentions } from "@/modules/people/features/detentions/data/use-detentions";
import { buildPeopleDetentionPath } from "@/modules/people/shared/domain/people-relation-routes";
import type { PersonDetention } from "@/modules/people/shared/domain/types";
import { DetailRelationTablePanel } from "@/web-client/detail/DetailRelationTablePanel";

function truncate(value: string | null | undefined, size = 42) {
  const text = (value ?? "").trim();
  if (!text) return "-";
  return text.length > size ? `${text.slice(0, size - 1)}...` : text;
}

export function DetentionsPanel({ personId }: { personId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { detentions, isLoading, error, remove } = useDetentions(personId);

  const columns = React.useMemo<ColumnDef<PersonDetention, unknown>[]>(
    () => [
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">{row.original.status}</span>
        ),
      },
      {
        accessorKey: "unit",
        header: "Unidade",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">{truncate(row.original.unit)}</span>
        ),
      },
      {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">{truncate(row.original.type, 24)}</span>
        ),
      },
      {
        accessorKey: "startDate",
        header: "Inicio",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {row.original.startDate?.slice(0, 10) ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "notes",
        header: "Notas",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">{truncate(row.original.notes)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 60,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                void remove(row.original.id);
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [remove],
  );

  const filterRow = React.useCallback((row: PersonDetention, query: string) => {
    const values = [row.status, row.type, row.unit, row.notes];
    return values.some((value) => String(value ?? "").toLowerCase().includes(query));
  }, []);

  return (
    <DetailRelationTablePanel
      data={detentions}
      columns={columns}
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          withTenantPath(buildPeopleDetentionPath(personId, row.id), tenantSlug),
        )
      }
      searchPlaceholder="Pesquisar registros"
      filterRow={filterRow}
      addHref={withTenantPath(buildPeopleDetentionPath(personId), tenantSlug)}
      addLabel="Novo registro"
      loading={isLoading}
      error={error}
      emptyMessage="Nenhum registro de reclusao."
      tableMinWidthClassName="min-w-[920px]"
      tableInitialColumnPinning={{ right: ["actions"] }}
      filterFields={[
        { name: "status", label: "Status", type: "text" },
        { name: "unidade", label: "Unidade", type: "text" },
        { name: "tipo", label: "Tipo", type: "text" },
        { name: "inicio", label: "Inicio", type: "date" },
        { name: "notas", label: "Notas", type: "text" },
      ]}
      buildSearchRecord={(row) => ({
        status: row.status,
        unidade: row.unit ?? null,
        tipo: row.type ?? null,
        inicio: row.startDate ?? null,
        notas: row.notes ?? null,
      })}
      searchActionId="people.detentions"
    />
  );
}
