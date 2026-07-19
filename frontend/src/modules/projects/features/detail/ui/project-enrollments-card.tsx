"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ListChecks, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import { SectionCard } from "@/components/section-card";
import { SectionDialog } from "@/components/section-dialog";
import { useConfirm } from "@/components/confirm/use-confirm";
import { useToast } from "@/components/ui/use-toast";
import {
  deleteProjectEnrollment,
  listProjectEnrollments,
  updateProjectEnrollment,
  type ApiProjectEnrollment,
  type EnrollmentStatus,
} from "@/modules/projects/api";
import { BulkEnrollmentDialog } from "@/modules/projects/features/detail/ui/bulk-enrollment-dialog";
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_OPTIONS,
  PROJECT_PARTICIPATION_ROLE_LABELS,
  PROJECT_PARTICIPATION_ROLE_OPTIONS,
} from "@/modules/projects/shared/domain/projects.constants";
import { formatDateOnlyPtBR } from "@/lib/date";
import {
  GENDER_LABELS,
  RACE_COLOR_LABELS,
  SEX_LABELS,
  getAgeFromBirthDate,
  resolveLabel,
} from "@/modules/people/shared/domain/utils";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { ListView } from "@/web-client/views/ListView";

type EnrollmentFormValues = {
  status: EnrollmentStatus;
  role: import("@/modules/projects/api").ProjectParticipationRole;
  startsAt: string;
  endsAt: string;
};

function formatDate(value: string | null) {
  return formatDateOnlyPtBR(value);
}

function resolveStatusBadge(status: EnrollmentStatus) {
  const label = ENROLLMENT_STATUS_LABELS[status] ?? status;
  switch (status) {
    case "ENDED":
      return <Badge variant="outline">{label}</Badge>;
    case "ACTIVE":
    default:
      return <Badge variant="secondary">{label}</Badge>;
  }
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

const ENROLLMENT_FIELDS: FormField<EnrollmentFormValues>[] = [
  {
    name: "status",
    label: "Status",
    type: "select",
    options: ENROLLMENT_STATUS_OPTIONS,
    required: true,
  },
  {
    name: "role",
    label: "Papel",
    type: "select",
    options: PROJECT_PARTICIPATION_ROLE_OPTIONS,
    required: true,
  },
  { name: "startsAt", label: "Inicio", type: "date" },
  { name: "endsAt", label: "Termino", type: "date" },
];

type ProjectEnrollmentsCardProps = {
  token: string;
  projectId: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canReadPeople: boolean;
};

export function ProjectEnrollmentsCard({
  token,
  projectId,
  canRead,
  canCreate,
  canUpdate,
  canDelete,
  canReadPeople,
}: ProjectEnrollmentsCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [rows, setRows] = React.useState<ApiProjectEnrollment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = React.useState("");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiProjectEnrollment | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState<ApiProjectEnrollment[]>(
    [],
  );
  const [bulkActionLoading, setBulkActionLoading] = React.useState(false);
  const requestedEnrollmentId = searchParams.get("enrollmentId");

  const fields = React.useMemo(() => ENROLLMENT_FIELDS, []);

  const columns = React.useMemo<ColumnDef<ApiProjectEnrollment>[]>(
    () => {
      const base: ColumnDef<ApiProjectEnrollment>[] = [
        {
          id: "person",
          header: "Pessoa",
          accessorFn: (item) => item.person.fullName,
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
                {row.original.person.status ? (
                  <p className="text-[11px] text-muted-foreground">
                    {row.original.person.status}
                  </p>
                ) : null}
              </div>
            </div>
          ),
        },
        {
          id: "age",
          header: "Idade",
          accessorFn: (item) => getAgeFromBirthDate(item.person.birthDate) ?? null,
          meta: { dataType: "number" },
          cell: ({ row }) => {
            const age = getAgeFromBirthDate(row.original.person.birthDate);
            return <span className="text-xs">{age ?? "-"}</span>;
          },
        },
      ];

      const demographics: ColumnDef<ApiProjectEnrollment>[] = canReadPeople
        ? [
            {
              id: "sex",
              header: "Sexo",
              accessorFn: (item) => item.person.sex ?? null,
              meta: { valueMap: SEX_LABELS },
              cell: ({ row }) => (
                <span className="text-xs">
                  {resolveLabel(row.original.person.sex ?? null, SEX_LABELS)}
                </span>
              ),
            },
            {
              id: "gender",
              header: "Genero",
              accessorFn: (item) => item.person.gender ?? null,
              meta: { valueMap: GENDER_LABELS },
              cell: ({ row }) => (
                <span className="text-xs">
                  {resolveLabel(
                    row.original.person.gender ?? null,
                    GENDER_LABELS,
                  )}
                </span>
              ),
            },
            {
              id: "raceColor",
              header: "Raca/Cor",
              accessorFn: (item) => item.person.raceColor ?? null,
              meta: { valueMap: RACE_COLOR_LABELS },
              cell: ({ row }) => (
                <span className="text-xs">
                  {resolveLabel(
                    row.original.person.raceColor ?? null,
                    RACE_COLOR_LABELS,
                  )}
                </span>
              ),
            },
          ]
        : [];

      const structure: ColumnDef<ApiProjectEnrollment>[] = [
        {
          id: "role",
          header: "Papel",
          accessorFn: (item) => item.role,
          cell: ({ row }) => (
            <span className="text-xs">
              {PROJECT_PARTICIPATION_ROLE_LABELS[row.original.role] ?? row.original.role}
            </span>
          ),
        },
        {
          id: "groups",
          header: "Grupos",
          accessorFn: (item) =>
            item.groups?.map((group) => group.name) ?? [],
          cell: ({ row }) => {
            const groups = row.original.groups ?? [];
            if (groups.length === 0) {
              return <span className="text-xs">Sem grupo</span>;
            }
            const label = groups.map((group) => group.name).join(", ");
            return (
              <span className="text-xs truncate" title={label}>
                {label}
              </span>
            );
          },
        },
        {
          id: "peopleGroups",
          header: "Grupo de Pessoas",
          accessorFn: (item) => item.peopleGroups?.map((peopleGroup) => peopleGroup.name) ?? [],
          cell: ({ row }) => {
            const label = row.original.peopleGroups?.map((peopleGroup) => peopleGroup.name).join(", ") ?? "";
            return <span className="text-xs">{label || "Sem grupo de pessoas"}</span>;
          },
        },
      ];

      const status: ColumnDef<ApiProjectEnrollment>[] = [
        {
          accessorKey: "status",
          header: "Status",
          cell: ({ row }) => (
            <div className="space-y-1">
              {resolveStatusBadge(row.original.status)}
              <p className="text-[11px] text-muted-foreground">
                {row.original.startsAt || row.original.endsAt
                  ? `${formatDate(row.original.startsAt)} - ${formatDate(
                      row.original.endsAt,
                    )}`
                  : "Periodo nao informado"}
              </p>
            </div>
          ),
        },
      ];

      return [...base, ...demographics, ...structure, ...status];
    },
    [canReadPeople, tenantSlug],
  );

  const loadEnrollments = React.useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listProjectEnrollments(token, projectId, {
        q: search.trim() || undefined,
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
          : "Falha ao carregar participantes.";
      setError(message);
      setRows([]);
      setTotalCount(0);
      setPageCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    projectId,
    canRead,
    pagination.pageIndex,
    pagination.pageSize,
    search,
  ]);

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search]);

  React.useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  React.useEffect(() => {
    if (!requestedEnrollmentId || !canUpdate || loading || dialogOpen) {
      return;
    }

    const target = rows.find((row) => row.id === requestedEnrollmentId);
    if (!target) {
      return;
    }

    setEditing(target);
    setFormError(null);
    setDialogOpen(true);
  }, [canUpdate, dialogOpen, loading, requestedEnrollmentId, rows]);

  const initialValues = React.useMemo<Partial<EnrollmentFormValues>>(() => {
    if (!editing) {
      return {
        status: "ACTIVE",
        role: "PUBLICO_ATENDIDO",
        startsAt: "",
        endsAt: "",
      };
    }
    return {
      status: editing.status,
      role: editing.role,
      startsAt: editing.startsAt ? editing.startsAt.slice(0, 10) : "",
      endsAt: editing.endsAt ? editing.endsAt.slice(0, 10) : "",
    };
  }, [editing]);

  const openEdit = React.useCallback(
    (item: ApiProjectEnrollment) => {
      if (!canUpdate) return;
      router.replace(
        withTenantPath(
          `/projects/${projectId}/enrollments?enrollmentId=${encodeURIComponent(item.id)}`,
          tenantSlug,
        ),
      );
      setEditing(item);
      setFormError(null);
      setDialogOpen(true);
    },
    [canUpdate, projectId, router, tenantSlug],
  );

  const normalizeValues = (values: EnrollmentFormValues) => ({
    status: values.status,
    role: values.role,
    startsAt: values.startsAt.trim() ? values.startsAt.trim() : null,
    endsAt: values.endsAt.trim() ? values.endsAt.trim() : null,
  });

  const handleSubmit = async (values: EnrollmentFormValues) => {
    if (!canUpdate) return;
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = normalizeValues(values);
      await updateProjectEnrollment(token, projectId, editing.id, payload);
      toast({ title: "Participante atualizado" });
      setDialogOpen(false);
      setEditing(null);
      loadEnrollments();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao salvar vinculo.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = React.useCallback(
    async (item: ApiProjectEnrollment) => {
      if (!canDelete) return;
      const confirmed = await confirm({
        title: "Encerrar matricula",
        description: `Encerrar a matricula de "${item.person.fullName}" neste projeto preservando o historico?`,
        confirmLabel: "Encerrar",
        cancelLabel: "Cancelar",
        confirmVariant: "destructive",
      });
      if (!confirmed) return;
      try {
        await deleteProjectEnrollment(token, projectId, item.id);
        toast({ title: "Matricula encerrada" });
        loadEnrollments();
      } catch (err) {
        toast({
          title: "Falha ao encerrar",
          description:
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Tente novamente.",
          variant: "destructive",
        });
      }
    },
    [token, projectId, canDelete, confirm, toast, loadEnrollments],
  );

  const handleBulkEnd = React.useCallback(async () => {
    if (!canUpdate) return;
    if (selectedRows.length === 0) return;

    const confirmed = await confirm({
      title: "Encerrar matriculas",
      description: `Encerrar ${selectedRows.length} matriculas selecionadas?`,
      confirmLabel: "Encerrar",
      cancelLabel: "Cancelar",
    });
    if (!confirmed) return;

    setBulkActionLoading(true);
    let ended = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      await runInBatches(selectedRows, 6, async (item) => {
        try {
          await updateProjectEnrollment(token, projectId, item.id, {
            status: "ENDED",
          });
          ended += 1;
        } catch (err) {
          failed += 1;
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Tente novamente.";
          errors.push(`${item.person.fullName}: ${message}`);
        }
      });

      toast({
        title: "Acao em massa concluida",
        description: `Encerradas: ${ended} - Erros: ${failed}`,
        variant: failed > 0 ? "destructive" : "default",
      });

      if (failed > 0) {
        setFormError(errors.slice(0, 5).join("\n"));
      }

      setSelectionMode(false);
      setSelectedRows([]);
      loadEnrollments();
    } finally {
      setBulkActionLoading(false);
    }
  }, [
    canUpdate,
    confirm,
    loadEnrollments,
    projectId,
    selectedRows,
    toast,
    token,
  ]);

  const handleBulkDelete = React.useCallback(async () => {
    if (!canDelete) return;
    if (selectedRows.length === 0) return;

    const confirmed = await confirm({
      title: "Encerrar matriculas",
      description: `Encerrar ${selectedRows.length} matriculas selecionadas preservando o historico?`,
      confirmLabel: "Encerrar",
      cancelLabel: "Cancelar",
      confirmVariant: "destructive",
    });
    if (!confirmed) return;

    setBulkActionLoading(true);
    let removed = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      await runInBatches(selectedRows, 6, async (item) => {
        try {
          await deleteProjectEnrollment(token, projectId, item.id);
          removed += 1;
        } catch (err) {
          failed += 1;
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Tente novamente.";
          errors.push(`${item.person.fullName}: ${message}`);
        }
      });

      toast({
        title: "Acao em massa concluida",
        description: `Encerradas: ${removed} - Erros: ${failed}`,
        variant: failed > 0 ? "destructive" : "default",
      });

      if (failed > 0) {
        setFormError(errors.slice(0, 5).join("\n"));
      }

      setSelectionMode(false);
      setSelectedRows([]);
      loadEnrollments();
    } finally {
      setBulkActionLoading(false);
    }
  }, [
    canDelete,
    confirm,
    loadEnrollments,
    projectId,
    selectedRows,
    toast,
    token,
  ]);

  const handleQuickEnd = React.useCallback(
    async (item: ApiProjectEnrollment) => {
      if (!canUpdate) return;
      const confirmed = await confirm({
        title: "Encerrar matricula",
        description: `Encerrar a matricula de "${item.person.fullName}"?`,
        confirmLabel: "Encerrar",
        cancelLabel: "Cancelar",
      });
      if (!confirmed) return;
      try {
        await updateProjectEnrollment(token, projectId, item.id, {
          status: "ENDED",
        });
        toast({ title: "Matricula encerrada" });
        loadEnrollments();
      } catch (err) {
        toast({
          title: "Falha ao encerrar",
          description:
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Tente novamente.",
          variant: "destructive",
        });
      }
    },
    [token, projectId, canUpdate, confirm, toast, loadEnrollments],
  );

  const listColumns = React.useMemo<ColumnDef<ApiProjectEnrollment>[]>(
    () => {
      if (!canUpdate && !canDelete) {
        return columns;
      }

      return [
        ...columns,
        {
          id: "actions",
          header: "Acoes",
          cell: ({ row }) => (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                  >
                    Acoes
                    <ChevronDown className="ml-2 size-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canUpdate ? (
                    <>
                      <DropdownMenuItem onSelect={() => openEdit(row.original)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleQuickEnd(row.original)}>
                        Encerrar
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      onSelect={() => handleDelete(row.original)}
                      className="text-destructive focus:text-destructive"
                    >
                      Encerrar
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        },
      ];
    },
    [canDelete, canUpdate, columns, handleDelete, handleQuickEnd, openEdit],
  );

  if (!canRead) {
    return (
      <SectionCard
        title="Participantes"
        subtitle="Voce nao tem permissao para visualizar matriculas."
      >
        <p className="text-xs text-muted-foreground">
          Solicite acesso ao administrador do sistema.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Participantes"
      subtitle="Vincule pessoas ao projeto e organize os grupos nas telas de gestao."
      actions={
        canCreate ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBulkOpen(true)}
              title="Selecionar varias pessoas e vincular de uma vez."
            >
              <Plus className="mr-2 size-4" />
              Adicionar participantes
            </Button>
          </div>
        ) : null
      }
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Busca
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar participantes"
            />
          </div>

          {canUpdate || canDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={selectionMode ? "secondary" : "outline"}
                disabled={bulkActionLoading}
                onClick={() => {
                  setSelectionMode((prev) => {
                    const next = !prev;
                    if (!next) setSelectedRows([]);
                    return next;
                  });
                }}
                title={
                  selectionMode
                    ? "Desativar selecao de linhas"
                    : "Ativar selecao de linhas"
                }
              >
                <ListChecks className="mr-2 size-4" />
                {selectionMode ? "Cancelar selecao" : "Selecionar"}
              </Button>

              {selectionMode ? (
                <>
                  <span className="text-xs text-muted-foreground">
                    Selecionados: <strong>{selectedRows.length}</strong>
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={bulkActionLoading || selectedRows.length === 0}
                      >
                        Acoes <ChevronDown className="ml-2 size-4 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdate ? (
                        <DropdownMenuItem onSelect={handleBulkEnd}>
                          Encerrar selecionados
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete ? (
                        <DropdownMenuItem
                          onSelect={handleBulkDelete}
                          className="text-destructive focus:text-destructive"
                        >
                          Encerrar selecionados
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Total
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {totalCount}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Filtrados
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {rows.length}
            </div>
          </div>
        </div>

        <ListView<ApiProjectEnrollment>
          data={rows}
          columns={listColumns}
          className="min-h-[420px]"
          getRowId={(row) => row.id}
          enableRowSelection={selectionMode}
          onSelectionChange={setSelectedRows}
          onRowClick={selectionMode || !canUpdate ? undefined : (row) => openEdit(row)}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="text-xs text-muted-foreground">
            Pagina {Math.min(pagination.pageIndex + 1, Math.max(pageCount, 1))} de{' '}
            {Math.max(pageCount, 1)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((previous) => ({
                  ...previous,
                  pageIndex: Math.max(previous.pageIndex - 1, 0),
                }))
              }
              disabled={loading || pagination.pageIndex === 0}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((previous) => ({
                  ...previous,
                  pageIndex:
                    previous.pageIndex + 1 >= pageCount
                      ? previous.pageIndex
                      : previous.pageIndex + 1,
                }))
              }
              disabled={loading || pageCount <= 1 || pagination.pageIndex + 1 >= pageCount}
            >
              Proxima
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : null}

      <BulkEnrollmentDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        token={token}
        projectId={projectId}
        canReadPeople={canReadPeople}
        onCompleted={loadEnrollments}
      />

      <SectionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            router.replace(withTenantPath(`/projects/${projectId}/enrollments`, tenantSlug));
            setEditing(null);
          }
        }}
        title="Editar participante"
        description="Atualize status e periodo da matricula."
        contentClassName="max-w-[780px]"
      >
        {formError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <RecordForm<EnrollmentFormValues>
          fields={fields}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          disabled={saving}
          actions={{
            submit: {
              label: saving ? "Salvando..." : "Salvar",
              variant: "primary",
            },
            cancel: {
              label: "Cancelar",
              variant: "ghost",
              onClick: () => setDialogOpen(false),
            },
          }}
        />
      </SectionDialog>
    </SectionCard>
  );
}





