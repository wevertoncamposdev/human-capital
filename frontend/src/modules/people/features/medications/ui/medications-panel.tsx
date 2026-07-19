"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveMediaUrl } from "@/lib/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useMedications } from "@/modules/people/features/medications/data/use-medications";
import { buildPeopleMedicationPath } from "@/modules/people/shared/domain/people-relation-routes";
import type { Medication } from "@/modules/people/shared/domain/types";
import { DetailRelationTablePanel } from "@/web-client/detail/DetailRelationTablePanel";

function truncate(value: string | null | undefined, size = 44) {
  const text = (value ?? "").trim();
  if (!text) return "-";
  return text.length > size ? `${text.slice(0, size - 1)}...` : text;
}

export function MedicationsPanel({ personId }: { personId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { medications, isLoading, error, remove } = useMedications(personId);

  const columns = React.useMemo<ColumnDef<Medication, unknown>[]>(
    () => [
      {
        accessorKey: "medication",
        header: "Medicacao",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">{row.original.medication}</span>
        ),
      },
      {
        accessorKey: "reason",
        header: "Motivo",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.reason)}
          </span>
        ),
      },
      {
        accessorKey: "dosage",
        header: "Dosagem",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.dosage, 24)}
          </span>
        ),
      },
      {
        accessorKey: "schedule",
        header: "Frequencia",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.schedule, 24)}
          </span>
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
        id: "document",
        header: "Documento",
        cell: ({ row }) =>
          !row.original.documentUrl ? (
            <span className="block truncate whitespace-nowrap text-muted-foreground">-</span>
          ) : (
            <a
              href={resolveMediaUrl(row.original.documentUrl)}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline"
            >
              Abrir
              <ExternalLink className="size-3" />
            </a>
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

  const filterRow = React.useCallback((row: Medication, query: string) => {
    const values = [row.medication, row.reason, row.dosage, row.schedule, row.notes];
    return values.some((value) => String(value ?? "").toLowerCase().includes(query));
  }, []);

  return (
    <DetailRelationTablePanel
      data={medications}
      columns={columns}
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          withTenantPath(buildPeopleMedicationPath(personId, row.id), tenantSlug),
        )
      }
      searchPlaceholder="Pesquisar medicacoes"
      filterRow={filterRow}
      addHref={withTenantPath(buildPeopleMedicationPath(personId), tenantSlug)}
      addLabel="Nova medicacao"
      loading={isLoading}
      error={error}
      emptyMessage="Nenhuma medicacao cadastrada."
      tableMinWidthClassName="min-w-[1140px]"
      tableInitialColumnPinning={{ right: ["actions"] }}
      filterFields={[
        { name: "medicacao", label: "Medicacao", type: "text" },
        { name: "motivo", label: "Motivo", type: "text" },
        { name: "dosagem", label: "Dosagem", type: "text" },
        { name: "frequencia", label: "Frequencia", type: "text" },
        { name: "inicio", label: "Inicio", type: "date" },
        { name: "notas", label: "Notas", type: "text" },
      ]}
      buildSearchRecord={(row) => ({
        medicacao: row.medication,
        motivo: row.reason ?? null,
        dosagem: row.dosage ?? null,
        frequencia: row.schedule ?? null,
        inicio: row.startDate ?? null,
        notas: row.notes ?? null,
      })}
      searchActionId="people.medications"
    />
  );
}
