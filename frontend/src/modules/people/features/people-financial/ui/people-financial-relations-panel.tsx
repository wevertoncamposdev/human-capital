"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useFamilyRelationsContext } from "@/modules/people/features/family-members/context/family-relations-context";
import { usePeopleFinancial } from "@/modules/people/features/people-financial/data/use-people-financial";
import { buildPeopleFinancialEntryPath } from "@/modules/people/shared/domain/people-relation-routes";
import type { PersonFinancialEntry } from "@/modules/people/shared/domain/types";
import { DetailRelationTablePanel } from "@/web-client/detail/DetailRelationTablePanel";

const ENTRY_TYPE_LABELS: Record<PersonFinancialEntry["entryType"], string> = {
  INCOME: "Renda",
  EXPENSE: "Gasto",
  TRANSFER: "Transferencia",
  BENEFIT: "Beneficio",
};

function truncate(value: string | number | null | undefined, size = 36) {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  return text.length > size ? `${text.slice(0, size - 1)}...` : text;
}

export function PeopleFinancialRelationsPanel({ personId }: { personId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { data: familyData, loadDetailed, refresh: refreshFamily } =
    useFamilyRelationsContext();
  const { entries, isLoading, error, remove } = usePeopleFinancial(personId);

  React.useEffect(() => {
    if (!familyData) void loadDetailed();
  }, [familyData, loadDetailed]);

  const householdLabelById = React.useMemo(() => {
    const map = new Map<string, string>();
    const currentId = familyData?.household?.id ?? null;
    if (currentId) {
      map.set(currentId, familyData?.household?.name ?? "Residencia atual");
    }
    (familyData?.relatedHouseholds ?? []).forEach((item) => {
      if (!item.householdId) return;
      map.set(
        item.householdId,
        item.householdName ?? `Residencia de ${item.personName}`,
      );
    });
    return map;
  }, [familyData]);

  const columns = React.useMemo<ColumnDef<PersonFinancialEntry, unknown>[]>(
    () => [
      {
        accessorKey: "entryType",
        header: "Tipo",
        cell: ({ row }) => ENTRY_TYPE_LABELS[row.original.entryType],
      },
      {
        accessorKey: "category",
        header: "Categoria",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.category)}
          </span>
        ),
      },
      {
        accessorKey: "subcategory",
        header: "Subcategoria",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.subcategory)}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Valor",
        cell: ({ row }) => truncate(row.original.amount),
      },
      {
        accessorKey: "frequency",
        header: "Frequencia",
      },
      {
        id: "flow",
        header: "Familia / Fluxo",
        cell: ({ row }) => {
          if (row.original.entryType === "TRANSFER") {
            const from = householdLabelById.get(row.original.fromHouseholdId ?? "") ?? "-";
            const to = householdLabelById.get(row.original.toHouseholdId ?? "") ?? "-";
            return (
              <span className="block truncate whitespace-nowrap">
                {truncate(`${from} -> ${to}`, 42)}
              </span>
            );
          }
          return (
            <span className="block truncate whitespace-nowrap">
              {truncate(householdLabelById.get(row.original.householdId ?? "") ?? "-")}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.status, 18)}
          </span>
        ),
      },
      {
        accessorKey: "notes",
        header: "Notas",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.notes)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 60,
        cell: ({ row }) => (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              void (async () => {
                await remove(row.original.id);
                await refreshFamily();
              })();
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [householdLabelById, refreshFamily, remove],
  );

  const filterRow = React.useCallback((row: PersonFinancialEntry, query: string) => {
    const values = [
      row.entryType,
      row.category,
      row.subcategory,
      row.status,
      row.frequency,
      row.notes,
    ];
    return values.some((value) =>
      String(value ?? "").toLowerCase().includes(query),
    );
  }, []);

  return (
    <DetailRelationTablePanel
      data={entries}
      columns={columns}
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          withTenantPath(buildPeopleFinancialEntryPath(personId, row.id), tenantSlug),
        )
      }
      searchPlaceholder="Pesquisar financeiro"
      filterRow={filterRow}
      addHref={withTenantPath(buildPeopleFinancialEntryPath(personId), tenantSlug)}
      addLabel="Novo registro"
      loading={isLoading}
      error={error}
      emptyMessage="Nenhum registro financeiro cadastrado."
      tableMinWidthClassName="min-w-[1180px]"
      tableInitialColumnPinning={{ right: ["actions"] }}
      filterFields={[
        { name: "tipo", label: "Tipo", type: "text" },
        { name: "categoria", label: "Categoria", type: "text" },
        { name: "subcategoria", label: "Subcategoria", type: "text" },
        { name: "valor", label: "Valor", type: "number" },
        { name: "frequencia", label: "Frequencia", type: "text" },
        { name: "fluxo", label: "Familia / Fluxo", type: "text" },
        { name: "status", label: "Status", type: "text" },
        { name: "notas", label: "Notas", type: "text" },
      ]}
      buildSearchRecord={(row) => ({
        tipo: ENTRY_TYPE_LABELS[row.entryType],
        categoria: row.category ?? null,
        subcategoria: row.subcategory ?? null,
        valor: row.amount ?? null,
        frequencia: row.frequency ?? null,
        fluxo:
          row.entryType === "TRANSFER"
            ? `${householdLabelById.get(row.fromHouseholdId ?? "") ?? "-"} -> ${
                householdLabelById.get(row.toHouseholdId ?? "") ?? "-"
              }`
            : householdLabelById.get(row.householdId ?? "") ?? "-",
        status: row.status ?? null,
        notas: row.notes ?? null,
      })}
      searchActionId="people.financial-relations"
    />
  );
}
