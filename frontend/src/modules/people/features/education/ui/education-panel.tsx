"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useEducation } from "@/modules/people/features/education/data/use-education";
import { buildPeopleEducationPath } from "@/modules/people/shared/domain/people-relation-routes";
import type { EducationRecord } from "@/modules/people/shared/domain/types";
import { DetailRelationTablePanel } from "@/web-client/detail/DetailRelationTablePanel";

function truncate(value: string | null | undefined, size = 42) {
  const text = (value ?? "").trim();
  if (!text) return "-";
  return text.length > size ? `${text.slice(0, size - 1)}...` : text;
}

export function EducationPanel({ personId }: { personId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { educations, isLoading, error, remove } = useEducation(personId);

  const columns = React.useMemo<ColumnDef<EducationRecord, unknown>[]>(
    () => [
      {
        accessorKey: "level",
        header: "Nivel",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">{row.original.level}</span>
        ),
      },
      {
        accessorKey: "institution",
        header: "Instituicao",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.institution)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.status, 24)}
          </span>
        ),
      },
      {
        accessorKey: "grade",
        header: "Serie",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.grade, 20)}
          </span>
        ),
      },
      {
        accessorKey: "schoolYear",
        header: "Ano",
        cell: ({ row }) => (
          <span className="block truncate whitespace-nowrap">
            {truncate(row.original.schoolYear, 12)}
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

  const filterRow = React.useCallback((row: EducationRecord, query: string) => {
    const values = [row.level, row.institution, row.status, row.grade, row.schoolYear, row.notes];
    return values.some((value) => String(value ?? "").toLowerCase().includes(query));
  }, []);

  return (
    <DetailRelationTablePanel
      data={educations}
      columns={columns}
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          withTenantPath(buildPeopleEducationPath(personId, row.id), tenantSlug),
        )
      }
      searchPlaceholder="Pesquisar escolaridade"
      filterRow={filterRow}
      addHref={withTenantPath(buildPeopleEducationPath(personId), tenantSlug)}
      addLabel="Novo registro"
      loading={isLoading}
      error={error}
      emptyMessage="Nenhum registro de escolaridade."
      tableMinWidthClassName="min-w-[980px]"
      tableInitialColumnPinning={{ right: ["actions"] }}
      filterFields={[
        { name: "nivel", label: "Nivel", type: "text" },
        { name: "instituicao", label: "Instituicao", type: "text" },
        { name: "status", label: "Status", type: "text" },
        { name: "serie", label: "Serie", type: "text" },
        { name: "ano", label: "Ano", type: "text" },
        { name: "notas", label: "Notas", type: "text" },
      ]}
      buildSearchRecord={(row) => ({
        nivel: row.level,
        instituicao: row.institution ?? null,
        status: row.status ?? null,
        serie: row.grade ?? null,
        ano: row.schoolYear ?? null,
        notas: row.notes ?? null,
      })}
      searchActionId="people.education"
    />
  );
}
