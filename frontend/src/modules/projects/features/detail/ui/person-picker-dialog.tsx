"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { SectionDialog } from "@/components/section-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import {
  getAgeFromBirthDate,
  resolvePersonDisplayNames,
} from "@/modules/people/shared/domain/utils";
import { getTenantSlugFromPath } from "@/lib/tenant-path";
import { usePathname } from "next/navigation";
import {
  listEligibleProjectPeople,
  listProjectPeopleGroups,
  type ApiEligibleProjectPerson,
  type ApiProjectPeopleGroup,
} from "@/modules/projects/api";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { SearchBar } from "@/web-client/control-panel/SearchBar";
import { SearchPanelMenu } from "@/web-client/control-panel/SearchPanelMenu";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import type { Domain } from "@/web-client/domain/types";
import { peopleSearchView } from "@/web-client/registry/searchViews/people";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { TableView } from "@/web-client/views/TableView";

type PersonPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  title?: string;
  description?: string;
  onPick: (person: ApiEligibleProjectPerson) => void | Promise<void>;
  actionLabel?: string;
};

function mergeUniquePeople(
  current: ApiEligibleProjectPerson[],
  incoming: ApiEligibleProjectPerson[],
) {
  return Array.from(
    new Map([...current, ...incoming].map((person) => [person.id, person])).values(),
  );
}

function resolveEligiblePeopleGroups(person: ApiEligibleProjectPerson) {
  return person.eligiblePeopleGroups ?? person.eligibleSegments ?? [];
}

export function PersonPickerDialog({
  open,
  onOpenChange,
  projectId,
  title = "Selecionar pessoa",
  description,
  onPick,
  actionLabel = "Adicionar",
}: PersonPickerDialogProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const [rows, setRows] = React.useState<ApiEligibleProjectPerson[]>([]);
  const [selectedPeople, setSelectedPeople] = React.useState<ApiEligibleProjectPerson[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchText, setSearchText] = React.useState("");
  const [domain, setDomain] = React.useState<Domain>(null);
  const [groupBy, setGroupBy] = React.useState<string[]>([]);
  const [peopleGroupFilter, setPeopleGroupFilter] = React.useState<string>("__all__");
  const [peopleGroups, setPeopleGroups] = React.useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = React.useState(false);

  const columns = React.useMemo<ColumnDef<ApiEligibleProjectPerson>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const pageSelected =
            rows.length > 0 &&
            rows.every((person) => selectedPeople.some((selected) => selected.id === person.id));
          return (
            <Checkbox
              checked={pageSelected}
              onCheckedChange={(next) => {
                setSelectedPeople((previous) =>
                  next
                    ? mergeUniquePeople(previous, rows)
                    : previous.filter((person) => !rows.some((row) => row.id === person.id)),
                );
              }}
              aria-label="Selecionar pessoas da página"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={selectedPeople.some((person) => person.id === row.original.id)}
            onCheckedChange={(next) => {
              setSelectedPeople((previous) =>
                next
                  ? mergeUniquePeople(previous, [row.original])
                  : previous.filter((person) => person.id !== row.original.id),
              );
            }}
            aria-label={`Selecionar ${row.original.fullName}`}
          />
        ),
      },
      {
        accessorKey: "fullName",
        header: "Pessoa",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <PersonIdentityAvatarTrigger
              personId={row.original.id}
              tenantSlug={tenantSlug}
              fullName={row.original.fullName}
              socialName={row.original.socialName}
              birthDate={row.original.birthDate ?? null}
              avatarUrl={row.original.avatarUrl}
              hasHealthCondition={row.original.hasHealthCondition ?? false}
              hasMedication={row.original.hasMedication ?? false}
            />
            <div className="space-y-0.5">
              {(() => {
                const display = resolvePersonDisplayNames(
                  row.original.fullName,
                  row.original.socialName,
                );
                return (
                  <>
                    <p className="text-xs font-semibold text-foreground">{display.primary}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {display.secondary ? `${display.secondary} - ` : ""}
                      {row.original.status ?? "-"}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        ),
      },
      {
        id: "personType",
        header: "Tipo",
        accessorFn: (row) => row.personType ?? null,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.personType ?? "-"}
          </span>
        ),
      },
      {
        id: "peopleGroups",
        header: "Grupos de Pessoas",
        accessorFn: (row) =>
          resolveEligiblePeopleGroups(row)
            .map((peopleGroup) => peopleGroup.name)
            .join(", "),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {resolveEligiblePeopleGroups(row.original)
              .map((peopleGroup) => peopleGroup.name)
              .join(", ") || "-"}
          </span>
        ),
      },
      {
        id: "age",
        header: "Idade",
        accessorFn: (row) => getAgeFromBirthDate(row.birthDate) ?? null,
        meta: { dataType: "number" },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {getAgeFromBirthDate(row.original.birthDate) ?? "-"}
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
                void onPick(row.original);
              }}
            >
              {actionLabel}
            </Button>
          </div>
        ),
      },
    ],
    [actionLabel, onPick, rows, selectedPeople, tenantSlug],
  );

  const load = React.useCallback(async () => {
    if (!token || !open) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listEligibleProjectPeople(token, projectId, {
        q: searchText.trim() || undefined,
        filters: domain,
        peopleGroupId: peopleGroupFilter === "__all__" ? undefined : peopleGroupFilter,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      });
      setRows(response.data);
      setTotalCount(response.pagination.total);
      setPageCount(response.pagination.pages);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar pessoas.";
      setError(message);
      setRows([]);
      setTotalCount(0);
      setPageCount(0);
    } finally {
      setLoading(false);
    }
  }, [token, open, projectId, searchText, domain, peopleGroupFilter, pagination.pageIndex, pagination.pageSize]);

  React.useEffect(() => {
    if (!token || !open) return;
    listProjectPeopleGroups(token, projectId, { participationKind: "PARTICIPANT" })
      .then((rows: ApiProjectPeopleGroup[]) => {
        const next = rows
          .filter((row) => row.peopleGroup?.id)
          .map((row) => ({ id: row.peopleGroup.id, name: row.peopleGroup.name }));
        setPeopleGroups(Array.from(new Map(next.map((item) => [item.id, item])).values()));
      })
      .catch(() => setPeopleGroups([]));
  }, [token, open, projectId]);

  React.useEffect(() => {
    if (!open) return;
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    setSelectedPeople([]);
  }, [open, searchText, domain, peopleGroupFilter]);

  React.useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

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

  const handleSelectFiltered = React.useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const firstPage = await listEligibleProjectPeople(token, projectId, {
        q: searchText.trim() || undefined,
        filters: domain,
        peopleGroupId: peopleGroupFilter === "__all__" ? undefined : peopleGroupFilter,
        page: 1,
        limit: 200,
      });
      let allRows = [...firstPage.data];
      for (let page = 2; page <= firstPage.pagination.pages; page += 1) {
        const response = await listEligibleProjectPeople(token, projectId, {
          q: searchText.trim() || undefined,
          filters: domain,
          peopleGroupId: peopleGroupFilter === "__all__" ? undefined : peopleGroupFilter,
          page,
          limit: 200,
        });
        allRows = mergeUniquePeople(allRows, response.data);
      }
      setSelectedPeople((previous) => mergeUniquePeople(previous, allRows));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao selecionar pessoas filtradas.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [token, projectId, searchText, domain, peopleGroupFilter]);

  const handleBulkPick = React.useCallback(async () => {
    if (selectedPeople.length === 0) return;
    setSaving(true);
    try {
      for (const person of selectedPeople) {
        await onPick(person);
      }
      toast({
        title: "Pessoas adicionadas",
        description: `${selectedPeople.length} registro(s) processados.`,
      });
      setSelectedPeople([]);
    } finally {
      setSaving(false);
    }
  }, [onPick, selectedPeople, toast]);

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      contentClassName="max-w-[980px]"
      headerSlot={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Selecionados: <strong>{selectedPeople.length}</strong>
          </span>
          <Button type="button" variant="ghost" onClick={() => setSelectedPeople([])} disabled={saving || selectedPeople.length === 0}>
            Limpar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSelectedPeople((previous) => mergeUniquePeople(previous, rows))} disabled={saving || rows.length === 0}>
            Selecionar pagina
          </Button>
          <Button type="button" variant="ghost" onClick={() => void handleSelectFiltered()} disabled={saving || totalCount === 0}>
            Selecionar filtrados
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handleBulkPick()} disabled={saving || selectedPeople.length === 0}>
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
              onChange={(next) => setSearchText(next)}
              placeholder="Pesquisar"
              facets={queryFacets}
              rightSlot={
                <SearchPanelMenu
                  actionId="project-person-picker.people"
                  searchView={peopleSearchView}
                  domain={domain}
                  onDomainChange={(next) => {
                    setDomain(next);
                    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
                  }}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                  groupByOptions={peopleSearchView.groupBy}
                  snapshot={{ searchText, domain, groupBy, peopleGroupFilter }}
                  onApplyFavorite={(snapshot) => {
                    setSearchText(String(snapshot.searchText ?? ""));
                    setDomain((snapshot.domain as Domain) ?? null);
                    setGroupBy(Array.isArray(snapshot.groupBy) ? (snapshot.groupBy as string[]) : []);
                    setPeopleGroupFilter(
                      typeof snapshot.peopleGroupFilter === "string"
                        ? snapshot.peopleGroupFilter
                        : "__all__",
                    );
                  }}
                  variant="compact"
                />
              }
            />
          </div>

          <div className="min-w-[220px]">
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Grupo de Pessoas
            </label>
            <select
              value={peopleGroupFilter}
              onChange={(event) => setPeopleGroupFilter(event.target.value)}
              className="h-9 w-full rounded-none border-x-0 border-t-0 border-border/70 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            >
              <option value="__all__">Todos</option>
              {peopleGroups.map((peopleGroup) => (
                <option key={peopleGroup.id} value={peopleGroup.id}>
                  {peopleGroup.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TableView
          data={rows}
          columns={columns}
          onRowClick={(row) => {
            setSelectedPeople((previous) =>
              previous.some((person) => person.id === row.id)
                ? previous.filter((person) => person.id !== row.id)
                : mergeUniquePeople(previous, [row]),
            );
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
          disabled={loading || saving}
        />
      </div>

      {loading ? <p className="text-xs text-muted-foreground">Carregando...</p> : null}
    </SectionDialog>
  );
}
