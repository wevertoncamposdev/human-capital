"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveMediaUrl } from "@/lib/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useHealthConditions } from "@/modules/people/features/health-conditions/data/use-health-conditions";
import { buildPeopleHealthConditionPath } from "@/modules/people/shared/domain/people-relation-routes";
import type { HealthCondition } from "@/modules/people/shared/domain/types";
import { DetailRelationTablePanel } from "@/web-client/detail/DetailRelationTablePanel";

function truncate(value: string | null | undefined, size = 48) {
  const text = (value ?? "").trim();
  if (!text) return "-";
  return text.length > size ? `${text.slice(0, size - 1)}...` : text;
}

export function HealthConditionsPanel({ personId }: { personId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { conditions, isLoading, error, remove } = useHealthConditions(personId);

  const columns = React.useMemo<ColumnDef<HealthCondition, unknown>[]>(
    () => [
      {
        accessorKey: "type",
        header: "Condicao",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">{row.original.type}</span>
        ),
      },
      {
        accessorKey: "description",
        header: "Descricao",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.description)}
          </span>
        ),
      },
      {
        accessorKey: "severity",
        header: "Gravidade",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.severity, 24)}
          </span>
        ),
      },
      {
        accessorKey: "diagnosisDate",
        header: "Diagnostico",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {row.original.diagnosisDate?.slice(0, 10) ?? "-"}
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

  const filterRow = React.useCallback((row: HealthCondition, query: string) => {
    const values = [row.type, row.description, row.severity, row.notes];
    return values.some((value) => String(value ?? "").toLowerCase().includes(query));
  }, []);

  return (
    <DetailRelationTablePanel
      data={conditions}
      columns={columns}
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          withTenantPath(buildPeopleHealthConditionPath(personId, row.id), tenantSlug),
        )
      }
      searchPlaceholder="Pesquisar condicoes"
      filterRow={filterRow}
      addHref={withTenantPath(buildPeopleHealthConditionPath(personId), tenantSlug)}
      addLabel="Nova condicao"
      loading={isLoading}
      error={error}
      emptyMessage="Nenhuma condicao cadastrada."
      tableMinWidthClassName="min-w-[1080px]"
      tableInitialColumnPinning={{ right: ["actions"] }}
      filterFields={[
        { name: "condicao", label: "Condicao", type: "text" },
        { name: "descricao", label: "Descricao", type: "text" },
        { name: "gravidade", label: "Gravidade", type: "text" },
        { name: "diagnostico", label: "Diagnostico", type: "date" },
        { name: "notas", label: "Notas", type: "text" },
      ]}
      buildSearchRecord={(row) => ({
        condicao: row.type,
        descricao: row.description ?? null,
        gravidade: row.severity ?? null,
        diagnostico: row.diagnosisDate ?? null,
        notas: row.notes ?? null,
      })}
      searchActionId="people.health-conditions"
    />
  );
}
