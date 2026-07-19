"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionDialog } from "@/components/section-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getTenantSlugFromPath } from "@/lib/tenant-path";
import { usePathname } from "next/navigation";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { SearchBar } from "@/web-client/control-panel/SearchBar";
import { SearchPanelMenu } from "@/web-client/control-panel/SearchPanelMenu";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import type { Domain } from "@/web-client/domain/types";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { peopleSearchView } from "@/web-client/registry/searchViews/people";
import {
  getAgeFromBirthDate,
  resolvePersonDisplayNames,
} from "@/modules/people/shared/domain/utils";
import {
  createProjectEnrollment,
  listEligibleProjectPeople,
  listProjectPeopleGroups,
  type ApiEligibleProjectPerson,
  type ApiProjectPeopleGroup,
  type ProjectParticipationRole,
} from "@/modules/projects/api";
import {
  PROJECT_PARTICIPATION_ROLE_LABELS,
  PROJECT_PARTICIPATION_ROLE_OPTIONS,
} from "@/modules/projects/shared/domain/projects.constants";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { TableView } from "@/web-client/views/TableView";

type BulkEnrollmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  projectId: string;
  canReadPeople: boolean;
  onCompleted: () => void;
};

function resolveErrorMessage(err: unknown, fallback: string) {
  return err && typeof err === "object" && "message" in err
    ? String((err as { message?: string }).message)
    : fallback;
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  run: (item: T) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.allSettled(batch.map((item) => run(item)));
  }
}

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

export function BulkEnrollmentDialog({
  open,
  onOpenChange,
  token,
  projectId,
  canReadPeople,
  onCompleted,
}: BulkEnrollmentDialogProps) {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { toast } = useToast();

  const [peopleRows, setPeopleRows] = React.useState<ApiEligibleProjectPerson[]>([]);
  const [selectedPeople, setSelectedPeople] = React.useState<ApiEligibleProjectPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = React.useState(true);
  const [peopleError, setPeopleError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchText, setSearchText] = React.useState("");
  const [domain, setDomain] = React.useState<Domain>(null);
  const [groupBy, setGroupBy] = React.useState<string[]>([]);
  const [peopleGroupFilter, setPeopleGroupFilter] = React.useState("__all__");
  const [peopleGroups, setPeopleGroups] = React.useState<Array<{ id: string; name: string }>>([]);
  const [selectedRole, setSelectedRole] =
    React.useState<ProjectParticipationRole>("PUBLICO_ATENDIDO");
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const loadPeople = React.useCallback(async () => {
    if (!open) return;
    if (!canReadPeople) {
      setPeopleLoading(false);
      setPeopleError("Voce nao tem permissao para listar people.");
      setPeopleRows([]);
      setPageCount(0);
      return;
    }

    setPeopleLoading(true);
    setPeopleError(null);

    try {
      const response = await listEligibleProjectPeople(token, projectId, {
        q: searchText.trim() || undefined,
        filters: domain,
        peopleGroupId: peopleGroupFilter === "__all__" ? undefined : peopleGroupFilter,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      });
      setPeopleRows(response.data);
      setPageCount(response.pagination.pages);
    } catch (err) {
      setPeopleError(resolveErrorMessage(err, "Falha ao carregar people."));
      setPeopleRows([]);
      setPageCount(0);
    } finally {
      setPeopleLoading(false);
    }
  }, [
    canReadPeople,
    open,
    pagination.pageIndex,
    pagination.pageSize,
    projectId,
    searchText,
    domain,
    peopleGroupFilter,
    token,
  ]);

  React.useEffect(() => {
    if (!token || !open) return;

    listProjectPeopleGroups(token, projectId, { participationKind: "PARTICIPANT" })
      .then((rows: ApiProjectPeopleGroup[]) => {
        const next = (Array.isArray(rows) ? rows : [])
          .filter((row) => row.peopleGroup?.id)
          .map((row) => ({ id: row.peopleGroup.id, name: row.peopleGroup.name }));
        const unique = Array.from(new Map(next.map((item) => [item.id, item])).values());
        setPeopleGroups(unique);
      })
      .catch(() => setPeopleGroups([]));
  }, [open, projectId, token]);

  React.useEffect(() => {
    if (!open) return;
    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    setSelectedPeople([]);
  }, [open, searchText, peopleGroupFilter, domain]);

  React.useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

  const handleSingleLink = React.useCallback(
    async (person: ApiEligibleProjectPerson) => {
      setSaving(true);
      setFormError(null);
      try {
        await createProjectEnrollment(token, projectId, {
          personId: person.id,
          participationKind: "PARTICIPANT",
          role: selectedRole,
          startsAt: new Date().toISOString().slice(0, 10),
          status: "ACTIVE",
        });
        toast({
          title: "Participacao adicionada",
          description: `${person.fullName} entrou no projeto como ${PROJECT_PARTICIPATION_ROLE_LABELS[selectedRole]}.`,
        });
        setSelectedPeople((previous) =>
          previous.filter((selected) => selected.id !== person.id),
        );
        onCompleted();
        await loadPeople();
      } catch (err) {
        setFormError(resolveErrorMessage(err, "Falha ao adicionar pessoa ao projeto."));
      } finally {
        setSaving(false);
      }
    },
    [loadPeople, onCompleted, projectId, selectedRole, toast, token],
  );

  const handleBulkLink = React.useCallback(
    async (peopleToLink: ApiEligibleProjectPerson[]) => {
      if (peopleToLink.length === 0) return;

      setSaving(true);
      setFormError(null);
      let created = 0;
      let alreadyLinked = 0;
      let failed = 0;
      const errors: string[] = [];

      try {
        const today = new Date().toISOString().slice(0, 10);
        await runInBatches(peopleToLink, 6, async (person) => {
          try {
            await createProjectEnrollment(token, projectId, {
              personId: person.id,
              participationKind: "PARTICIPANT",
              role: selectedRole,
              startsAt: today,
              status: "ACTIVE",
            });
            created += 1;
          } catch (err) {
            const message = resolveErrorMessage(err, "Falha ao vincular pessoa.");
            if (message.toLowerCase().includes("ja esta vinculada")) {
              alreadyLinked += 1;
              return;
            }
            failed += 1;
            errors.push(`${person.fullName}: ${message}`);
          }
        });

        toast({
          title: "Vinculo em massa concluido",
          description: `Vinculadas: ${created} • Ja vinculadas: ${alreadyLinked} • Erros: ${failed}`,
          variant: failed > 0 ? "destructive" : "default",
        });

        onCompleted();
        setSelectedPeople([]);
        if (failed > 0) {
          setFormError(errors.slice(0, 5).join("\n"));
        }
        await loadPeople();
      } finally {
        setSaving(false);
      }
    },
    [loadPeople, onCompleted, projectId, selectedRole, toast, token],
  );

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

  const columns = React.useMemo<ColumnDef<ApiEligibleProjectPerson>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const pageSelected =
            peopleRows.length > 0 &&
            peopleRows.every((person) =>
              selectedPeople.some((selected) => selected.id === person.id),
            );

          return (
            <Checkbox
              checked={pageSelected}
              onCheckedChange={(next) => {
                setSelectedPeople((previous) =>
                  next
                    ? mergeUniquePeople(previous, peopleRows)
                    : previous.filter(
                        (person) => !peopleRows.some((row) => row.id === person.id),
                      ),
                );
              }}
              aria-label="Selecionar people da pagina"
            />
          );
        },
        enableSorting: false,
        cell: ({ row }) => {
          const checked = selectedPeople.some((person) => person.id === row.original.id);
          return (
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => {
                setSelectedPeople((previous) => {
                  if (next) {
                    return mergeUniquePeople(previous, [row.original]);
                  }
                  return previous.filter((person) => person.id !== row.original.id);
                });
              }}
              aria-label={`Selecionar ${row.original.fullName}`}
            />
          );
        },
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
              ageLabel={(() => {
                const age = getAgeFromBirthDate(row.original.birthDate);
                return age !== null ? `${age} anos` : null;
              })()}
              avatarUrl={row.original.avatarUrl}
              hasHealthCondition={row.original.hasHealthCondition ?? false}
              hasMedication={row.original.hasMedication ?? false}
            />
            <div className="leading-tight">
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
                      {display.secondary ? `${display.secondary} • ` : ""}
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
        accessorKey: "personType",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.personType ?? "-"}
          </span>
        ),
      },
      {
        id: "eligibility",
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
        accessorFn: (person) => getAgeFromBirthDate(person.birthDate) ?? null,
        meta: { dataType: "number" },
        cell: ({ row }) => {
          const age = getAgeFromBirthDate(row.original.birthDate);
          return (
            <span className="text-xs text-muted-foreground">
              {age !== null ? `${age}` : "-"}
            </span>
          );
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
                void handleSingleLink(row.original);
              }}
            >
              Adicionar
            </Button>
          </div>
        ),
      },
    ],
    [handleSingleLink, peopleRows, selectedPeople, tenantSlug],
  );

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar participante"
      description="Selecione pessoas elegiveis e adicione ao projeto com o papel desejado."
      contentClassName="max-w-[1100px] overflow-hidden"
    >
      {formError ? (
        <div className="whitespace-pre-line rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      {peopleError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {peopleError}
        </div>
      ) : null}

      <div className="flex max-h-[72vh] flex-col gap-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3">
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
                  actionId="project-enrollment-picker.people"
                  searchView={peopleSearchView}
                  domain={domain}
                  onDomainChange={(next) => {
                    setDomain(next);
                    setPagination((previous) => ({ ...previous, pageIndex: 0 }));
                  }}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                  groupByOptions={peopleSearchView.groupBy}
                  analysisTitle="Contexto"
                  analysisSlot={
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Grupo de Pessoas
                        </div>
                        <Select value={peopleGroupFilter} onValueChange={setPeopleGroupFilter}>
                          <SelectTrigger className="h-9 rounded-none border-x-0 border-t-0 border-border/70 bg-transparent px-0 text-sm shadow-none focus:ring-0">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todos</SelectItem>
                            {peopleGroups.map((peopleGroup) => (
                              <SelectItem key={peopleGroup.id} value={peopleGroup.id}>
                                {peopleGroup.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Papel no projeto
                        </div>
                        <Select
                          value={selectedRole}
                          onValueChange={(value) => setSelectedRole(value as ProjectParticipationRole)}
                        >
                          <SelectTrigger className="h-9 rounded-none border-x-0 border-t-0 border-border/70 bg-transparent px-0 text-sm shadow-none focus:ring-0">
                            <SelectValue placeholder="Selecione o papel" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_PARTICIPATION_ROLE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  }
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

          <div className="flex items-center gap-2 text-xs">
            <span className="whitespace-nowrap text-muted-foreground">
              Selecionados: <strong>{selectedPeople.length}</strong>
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-3"
              disabled={saving || selectedPeople.length === 0}
              onClick={() => void handleBulkLink(selectedPeople)}
            >
              {saving ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-0 overflow-x-auto">
            <TableView
              data={peopleRows}
              columns={columns}
              onRowClick={(row) => {
                setSelectedPeople((previous) =>
                  previous.some((person) => person.id === row.id)
                    ? previous.filter((person) => person.id !== row.id)
                    : mergeUniquePeople(previous, [row]),
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
            onPageSizeChange={(next) => setPagination({ pageIndex: 0, pageSize: next })}
            disabled={peopleLoading || saving}
          />
        </div>
      </div>

      {peopleLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : null}
    </SectionDialog>
  );
}
