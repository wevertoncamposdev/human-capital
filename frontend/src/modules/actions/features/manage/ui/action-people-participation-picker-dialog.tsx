"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionDialog } from "@/components/section-dialog";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { SearchBar } from "@/web-client/control-panel/SearchBar";
import { SearchPanelMenu } from "@/web-client/control-panel/SearchPanelMenu";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import type { Domain } from "@/web-client/domain/types";
import { getTenantSlugFromPath } from "@/lib/tenant-path";
import {
  listEligibleProjectActionPeople,
  type ActionPeopleParticipationRole,
} from "@/modules/actions/api";
import { type ApiProjectEnrollment } from "@/modules/projects/api";
import {
  ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS,
  ACTION_PEOPLE_PARTICIPATION_ROLE_OPTIONS,
} from "@/modules/actions/shared/domain/actions.constants";
import { PROJECT_PARTICIPATION_ROLE_LABELS } from "@/modules/projects/shared/domain/projects.constants";
import { peopleSearchView } from "@/web-client/registry/searchViews/people";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { TableView } from "@/web-client/views/TableView";

type ActionPeopleParticipationPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  projectId: string;
  actionId: string;
  onPick: (params: {
    enrollment: ApiProjectEnrollment;
    role: ActionPeopleParticipationRole;
  }) => void;
};

export function ActionPeopleParticipationPickerDialog({
  open,
  onOpenChange,
  token,
  projectId,
  actionId,
  onPick,
}: ActionPeopleParticipationPickerDialogProps) {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const [rows, setRows] = React.useState<ApiProjectEnrollment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [searchText, setSearchText] = React.useState("");
  const [domain, setDomain] = React.useState<Domain>(null);
  const [groupBy, setGroupBy] = React.useState<string[]>([]);
  const [role, setRole] = React.useState<ActionPeopleParticipationRole>("FACILITADOR");
  const [selectedRows, setSelectedRows] = React.useState<ApiProjectEnrollment[]>([]);
  const [saving, setSaving] = React.useState(false);

  const columns = React.useMemo<ColumnDef<ApiProjectEnrollment>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const pageSelected =
            rows.length > 0 &&
            rows.every((enrollment) =>
              selectedRows.some((selected) => selected.id === enrollment.id),
            );
          return (
            <Checkbox
              checked={pageSelected}
              onCheckedChange={(next) => {
                setSelectedRows((previous) =>
                  next
                    ? Array.from(new Map([...previous, ...rows].map((item) => [item.id, item])).values())
                    : previous.filter((item) => !rows.some((row) => row.id === item.id)),
                );
              }}
              aria-label="Selecionar pessoas da página"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={selectedRows.some((item) => item.id === row.original.id)}
            onCheckedChange={(next) => {
              setSelectedRows((previous) =>
                next
                  ? Array.from(new Map([...previous, row.original].map((item) => [item.id, item])).values())
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
              <div className="font-medium text-foreground">{row.original.person.fullName}</div>
              <div className="text-xs text-muted-foreground">
                {PROJECT_PARTICIPATION_ROLE_LABELS[row.original.role] ?? row.original.role}
                {row.original.peopleGroups?.length
                  ? ` - ${row.original.peopleGroups.map((group) => group.name).join(", ")}`
                  : ""}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "groups",
        header: "Grupos",
        accessorFn: (row) => row.groups.map((group) => group.name).join(", "),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.groups.map((group) => group.name).join(", ") || "Sem grupo"}
          </span>
        ),
      },
      {
        id: "role",
        header: "Novo papel",
        accessorFn: () => ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS[role],
        cell: () => (
          <span className="text-xs text-muted-foreground">
            {ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS[role]}
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
                onPick({ enrollment: row.original, role });
              }}
            >
              Adicionar
            </Button>
          </div>
        ),
      },
    ],
    [onPick, role, rows, selectedRows, tenantSlug],
  );

  const load = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listEligibleProjectActionPeople(token, projectId, actionId, {
        q: searchText.trim() || undefined,
        filters: domain,
        participationKind: "TEAM",
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      });
      setRows(response.data);
      setPageCount(response.pagination.pages);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar pessoas.";
      setError(message);
      setRows([]);
      setPageCount(0);
    } finally {
      setLoading(false);
    }
  }, [actionId, open, pagination.pageIndex, pagination.pageSize, projectId, searchText, domain, token]);

  React.useEffect(() => {
    if (!open) return;
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }, [open, searchText, domain]);

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

  const handleBulkAdd = React.useCallback(async () => {
    if (selectedRows.length === 0) return;
    setSaving(true);
    try {
      for (const enrollment of selectedRows) {
        await onPick({ enrollment, role });
      }
      setSelectedRows([]);
    } finally {
      setSaving(false);
    }
  }, [onPick, role, selectedRows]);
  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar pessoa"
      contentClassName="max-w-[1100px]"
      headerSlot={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Selecionados: <strong>{selectedRows.length}</strong>
          </span>
          <Button type="button" variant="secondary" disabled={saving || selectedRows.length === 0} onClick={() => void handleBulkAdd()}>
            {saving ? "Adicionando..." : "Adicionar selecionados"}
          </Button>
        </div>
      }
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchText}
              onChange={(next) => {
                setSearchText(next);
                setPagination((previous) => ({ ...previous, pageIndex: 0 }));
              }}
              placeholder="Pesquisar"
              facets={queryFacets}
              rightSlot={
                <SearchPanelMenu
                  actionId="action-people-picker.people"
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

          <div className="min-w-[240px]">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Papel</div>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as ActionPeopleParticipationRole)}
            >
              <SelectTrigger className="h-9 rounded-none border-x-0 border-t-0 border-border/70 bg-transparent px-0 text-sm shadow-none focus:ring-0">
                <SelectValue placeholder="Papel" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_PEOPLE_PARTICIPATION_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRows.length > 0 ? (
            <div className="min-w-[120px]">
              <div className="mb-2 text-xs font-medium text-muted-foreground opacity-0">
                Limpar
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-none border-x-0 border-t-0 border-border/70 px-0 text-sm"
                disabled={saving}
                onClick={() => setSelectedRows([])}
              >
                Limpar seleção
              </Button>
            </div>
          ) : null}
        </div>

        <TableView
          data={rows}
          columns={columns}
          onRowClick={(row) =>
            setSelectedRows((previous) =>
              previous.some((item) => item.id === row.id)
                ? previous.filter((item) => item.id !== row.id)
                : Array.from(new Map([...previous, row].map((item) => [item.id, item])).values()),
            )
          }
          minWidthClassName="min-w-[980px]"
        />

        <PaginationBar
          pageIndex={pagination.pageIndex}
          pageCount={pageCount}
          pageSize={pagination.pageSize}
          onPageIndexChange={(next) =>
            setPagination((previous) => ({ ...previous, pageIndex: next }))
          }
          onPageSizeChange={(next) => setPagination({ pageIndex: 0, pageSize: next })}
          disabled={loading || saving}
        />
      </div>

      {loading ? <p className="text-xs text-muted-foreground">Carregando...</p> : null}
    </SectionDialog>
  );
}
