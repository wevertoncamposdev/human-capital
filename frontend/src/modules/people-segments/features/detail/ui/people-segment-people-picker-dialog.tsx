"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { SectionDialog } from "@/components/section-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { TableView } from "@/web-client/views/TableView";
import { getTenantSlugFromPath } from "@/lib/tenant-path";
import { listPeople, type ApiPerson } from "@/modules/people/api";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { SearchBar } from "@/web-client/control-panel/SearchBar";
import { SearchPanelMenu } from "@/web-client/control-panel/SearchPanelMenu";
import { collectAndConditions, removeConditionAtIndex } from "@/web-client/domain/conditions";
import type { Domain, DomainValue } from "@/web-client/domain/types";
import { peopleSearchView } from "@/web-client/registry/searchViews/people";
import {
  getAgeFromBirthDate,
  resolvePersonDisplayNames,
} from "@/modules/people/shared/domain/utils";
import { useAuth } from "@/features/auth/auth-context";
import type { AdvancedFilter } from "@/web-client/filtering/advanced-filters";

function toFilterValue(value: DomainValue | undefined) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => String(item ?? "")).join(",");
  return String(value);
}

function mapDomainOperatorToAdvancedFilter(
  operator: string,
): AdvancedFilter["operator"] | null {
  switch (operator) {
    case "=":
      return "equals";
    case "contains":
    case "ilike":
      return "contains";
    case "in":
      return "in";
    case "not_in":
      return "notIn";
    case "is_null":
      return "isEmpty";
    case "not_null":
      return "isNotEmpty";
    case "between":
      return "between";
    case ">":
      return "gt";
    case ">=":
      return "gte";
    case "<":
      return "lt";
    case "<=":
      return "lte";
    case "starts_with":
      return "starts";
    case "ends_with":
      return "ends";
    default:
      return null;
  }
}

function serializePeopleDomain(domain: Domain | null | undefined) {
  const conditions = collectAndConditions(domain ?? null) ?? [];

  const filters = conditions
    .map<AdvancedFilter | null>((condition) => {
      const operator = mapDomainOperatorToAdvancedFilter(condition.operator);
      if (!operator) return null;
      const value =
        operator === "between" && Array.isArray(condition.value)
          ? condition.value.map((item) => String(item ?? "")).join("..")
          : toFilterValue(condition.value);
      return { columnId: condition.field, operator, value };
    })
    .filter(Boolean) as AdvancedFilter[];

  return filters.length ? JSON.stringify(filters) : undefined;
}

type PeopleSegmentPeoplePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  onPick: (person: ApiPerson) => void | Promise<void>;
  onBulkPick?: (people: ApiPerson[]) => void | Promise<void>;
};

export function PeopleSegmentPeoplePickerDialog({
  open,
  onOpenChange,
  title = "Adicionar participante",
  description,
  actionLabel = "Adicionar",
  onPick,
  onBulkPick,
}: PeopleSegmentPeoplePickerDialogProps) {
  const { token } = useAuth();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const [rows, setRows] = React.useState<ApiPerson[]>([]);
  const [selectedPeople, setSelectedPeople] = React.useState<ApiPerson[]>([]);
  const [loading, setLoading] = React.useState(true);
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

  const columns = React.useMemo<ColumnDef<ApiPerson>[]>(
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
                    ? Array.from(new Map([...previous, ...rows].map((item) => [item.id, item])).values())
                    : previous.filter((person) => !rows.some((row) => row.id === person.id)),
                );
              }}
              aria-label="Selecionar pessoas da pagina"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={selectedPeople.some((person) => person.id === row.original.id)}
            onCheckedChange={(next) => {
              setSelectedPeople((previous) =>
                next
                  ? Array.from(
                      new Map([...previous, row.original].map((item) => [item.id, item])).values(),
                    )
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
                    <p className="text-xs font-semibold text-foreground">
                      {display.primary}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.original.personType ?? "-"} - {row.original.status ?? "-"}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
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
                onPick(row.original);
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
      const response = await listPeople(token, {
        q: searchText.trim() || undefined,
        filters: serializePeopleDomain(domain),
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      });
      setRows(response.data);
      setPageCount(response.pagination.pages);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar people.";
      setError(message);
      setRows([]);
      setPageCount(0);
    } finally {
      setLoading(false);
    }
  }, [token, open, pagination.pageIndex, pagination.pageSize, searchText, domain]);

  React.useEffect(() => {
    if (!open) return;
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }, [open, searchText, domain]);

  React.useEffect(() => {
    if (!open) return;
    void load();
  }, [load, open]);

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
    if (selectedPeople.length === 0) return;
    setSaving(true);
    try {
      if (onBulkPick) {
        await onBulkPick(selectedPeople);
      } else {
        for (const person of selectedPeople) {
          await onPick(person);
        }
      }
      setSelectedPeople([]);
    } finally {
      setSaving(false);
    }
  }, [onBulkPick, onPick, selectedPeople]);

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
            Selecionados: <strong>{selectedPeople.length}</strong>
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 px-3"
            onClick={() => void handleBulkAdd()}
            disabled={saving || selectedPeople.length === 0}
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
            onChange={(next) => {
              setSearchText(next);
              setPagination((previous) => ({ ...previous, pageIndex: 0 }));
            }}
            placeholder="Pesquisar"
            facets={queryFacets}
            rightSlot={
              <SearchPanelMenu
                actionId="people-group-picker.people"
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
                setSelectedPeople((previous) =>
                  previous.some((person) => person.id === row.id)
                    ? previous.filter((person) => person.id !== row.id)
                    : Array.from(new Map([...previous, row].map((item) => [item.id, item])).values()),
                );
              }}
              minWidthClassName="min-w-[920px]"
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
            onPageSizeChange={(next) => setPagination({ pageIndex: 0, pageSize: next })}
            disabled={loading || saving}
          />
        </div>
      </div>

      {loading ? <p className="text-xs text-muted-foreground">Carregando...</p> : null}
    </SectionDialog>
  );
}
