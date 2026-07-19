"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionDialog } from "@/components/section-dialog";
import { getTenantSlugFromPath } from "@/lib/tenant-path";
import {
  listProjectEnrollments,
  type ApiProjectEnrollment,
} from "@/modules/projects/api";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { SearchBar } from "@/web-client/control-panel/SearchBar";
import { SearchPanelMenu } from "@/web-client/control-panel/SearchPanelMenu";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import type { Domain } from "@/web-client/domain/types";
import { peopleSearchView } from "@/web-client/registry/searchViews/people";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { getAgeFromBirthDate } from "@/modules/people/shared/domain/utils";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { TableView } from "@/web-client/views/TableView";

type ProjectEnrollmentPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  projectId: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  excludeGroupId?: string;
  excludePeopleGroupId?: string;
  onPick: (enrollment: ApiProjectEnrollment) => void | Promise<void>;
  onBulkPick?: (enrollments: ApiProjectEnrollment[]) => void | Promise<void>;
};

function mergeUniqueEnrollments(
  current: ApiProjectEnrollment[],
  incoming: ApiProjectEnrollment[],
) {
  return Array.from(
    new Map([...current, ...incoming].map((item) => [item.id, item])).values(),
  );
}

export function ProjectEnrollmentPickerDialog({
  open,
  onOpenChange,
  token,
  projectId,
  title = "Adicionar participantes",
  description = "Escolha participantes ja matriculados no projeto.",
  actionLabel = "Adicionar",
  excludeGroupId,
  excludePeopleGroupId,
  onPick,
  onBulkPick,
}: ProjectEnrollmentPickerDialogProps) {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const [rows, setRows] = React.useState<ApiProjectEnrollment[]>([]);
  const [selectedRows, setSelectedRows] = React.useState<ApiProjectEnrollment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchText, setSearchText] = React.useState("");
  const [domain, setDomain] = React.useState<Domain>(null);
  const [groupBy, setGroupBy] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const columns = React.useMemo<ColumnDef<ApiProjectEnrollment>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const pageSelected =
            rows.length > 0 &&
            rows.every((enrollment) => selectedRows.some((selected) => selected.id === enrollment.id));
          return (
            <Checkbox
              checked={pageSelected}
              onCheckedChange={(next) => {
                setSelectedRows((previous) =>
                  next
                    ? mergeUniqueEnrollments(previous, rows)
                    : previous.filter((item) => !rows.some((row) => row.id === item.id)),
                );
              }}
              aria-label="Selecionar participantes da pagina"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={selectedRows.some((item) => item.id === row.original.id)}
            onCheckedChange={(next) => {
              setSelectedRows((previous) =>
                next
                  ? mergeUniqueEnrollments(previous, [row.original])
                  : previous.filter((item) => item.id !== row.original.id),
              );
            }}
            aria-label={`Selecionar ${row.original.person.fullName}`}
          />
        ),
      },
      {
        id: "person",
        header: "Pessoa",
        accessorFn: (row) => row.person.fullName,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <PersonIdentityAvatarTrigger
              personId={row.original.person.id}
              tenantSlug={tenantSlug}
              fullName={row.original.person.fullName}
              birthDate={row.original.person.birthDate ?? null}
              avatarUrl={row.original.person.avatarUrl}
              hasHealthCondition={row.original.person.hasHealthCondition}
              hasMedication={row.original.person.hasMedication}
            />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {row.original.person.fullName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {row.original.person.status ?? "-"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "age",
        header: "Idade",
        accessorFn: (row) => getAgeFromBirthDate(row.person.birthDate) ?? null,
        meta: { dataType: "number" },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {getAgeFromBirthDate(row.original.person.birthDate) ?? "-"}
          </span>
        ),
      },
      {
        id: "groups",
        header: "Grupos",
        accessorFn: (row) => row.groups.map((group) => group.name).join(", "),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.groups.length
              ? row.original.groups.map((group) => group.name).join(", ")
              : "Sem grupo"}
          </span>
        ),
      },
      {
        id: "peopleGroups",
        header: "Grupo de Pessoas",
        accessorFn: (row) => row.peopleGroups.map((peopleGroup) => peopleGroup.name).join(", "),
        cell: ({ row }) => {
          const label = row.original.peopleGroups.map((peopleGroup) => peopleGroup.name).join(", ");
          return <span className="text-xs text-muted-foreground">{label || "Sem grupo de pessoas"}</span>;
        },
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
                void onPick(row.original);
              }}
            >
              {actionLabel}
            </Button>
          </div>
        ),
      },
    ],
    [actionLabel, onPick, rows, selectedRows, tenantSlug],
  );

  const load = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listProjectEnrollments(token, projectId, {
        status: "ACTIVE",
        excludeGroupId,
        excludePeopleGroupId,
        q: searchText.trim() || undefined,
        filters: domain,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      });
      setRows(response.data);
      setPageCount(response.pagination.pages);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar participantes.";
      setError(message);
      setRows([]);
      setPageCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    domain,
    excludePeopleGroupId,
    excludeGroupId,
    open,
    pagination.pageIndex,
    pagination.pageSize,
    projectId,
    searchText,
    token,
  ]);

  React.useEffect(() => {
    if (!open) return;
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    setSelectedRows([]);
  }, [open, searchText, domain, excludeGroupId, excludePeopleGroupId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const removeDomainCondition = React.useCallback((index: number) => {
    setDomain((previous) => removeConditionAtIndex(previous, "and", index));
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }, []);

  const queryFacets = React.useMemo(
    () =>
      buildQueryFacets({
        domain,
        groupBy,
        searchView: peopleSearchView,
        onClearGroupBy: () => setGroupBy([]),
        onClearDomain: () => {
          setDomain(null);
          setPagination((previous) => ({ ...previous, pageIndex: 0 }));
        },
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [domain, groupBy, removeDomainCondition],
  );

  const handleBulkPick = React.useCallback(async () => {
    if (selectedRows.length === 0) return;
    setSaving(true);
    try {
      if (onBulkPick) {
        await onBulkPick(selectedRows);
      } else {
        for (const enrollment of selectedRows) {
          await onPick(enrollment);
        }
      }
      setSelectedRows([]);
    } finally {
      setSaving(false);
    }
  }, [onBulkPick, onPick, selectedRows]);

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      contentClassName="max-w-[1100px] overflow-hidden"
      headerSlot={
        <div className="flex items-center gap-2 text-xs">
          <span className="whitespace-nowrap text-muted-foreground">
            Selecionados: <strong>{selectedRows.length}</strong>
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 px-3"
            disabled={saving || selectedRows.length === 0}
            onClick={() => void handleBulkPick()}
          >
            {saving ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      }
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex max-h-[72vh] flex-col gap-4 overflow-hidden">
        <div className="min-w-0 flex-1">
          <SearchBar
            value={searchText}
            onChange={(next) => setSearchText(next)}
            placeholder="Pesquisar"
            facets={queryFacets}
            rightSlot={
              <SearchPanelMenu
                actionId="project-enrollment-picker.project-enrollment"
                searchView={peopleSearchView}
                domain={domain}
                onDomainChange={(next) => {
                  setDomain(next);
                  setPagination((previous) => ({ ...previous, pageIndex: 0 }));
                }}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                groupByOptions={peopleSearchView.groupBy}
                snapshot={{ searchText, domain, groupBy }}
                onApplyFavorite={(snapshot) => {
                  setSearchText(String(snapshot.searchText ?? ""));
                  setDomain((snapshot.domain as Domain) ?? null);
                  setGroupBy(Array.isArray(snapshot.groupBy) ? (snapshot.groupBy as string[]) : []);
                }}
                variant="compact"
              />
            }
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-0 overflow-x-auto">
            <TableView
              data={rows}
              columns={columns}
              onRowClick={(row) => {
                setSelectedRows((previous) =>
                  previous.some((item) => item.id === row.id)
                    ? previous.filter((item) => item.id !== row.id)
                    : mergeUniqueEnrollments(previous, [row]),
                );
              }}
              minWidthClassName="min-w-[980px]"
            />
          </div>
        </div>

        <div className="border-t border-border/50 pt-3">
          <PaginationBar
            pageIndex={pagination.pageIndex}
            pageCount={pageCount}
            pageSize={pagination.pageSize}
            onPageIndexChange={(next) =>
              setPagination((previous) => ({ ...previous, pageIndex: next }))
            }
            onPageSizeChange={(next) =>
              setPagination({ pageIndex: 0, pageSize: next })
            }
            disabled={loading || saving}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : null}
    </SectionDialog>
  );
}
