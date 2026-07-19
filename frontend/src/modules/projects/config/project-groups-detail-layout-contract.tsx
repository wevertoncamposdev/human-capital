"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ApiProject,
  ApiProjectEnrollment,
  ApiProjectGroup,
} from "@/modules/projects/api";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { getAgeFromBirthDate } from "@/modules/people/shared/domain/utils";
import { StandardDetailMetadataSide } from "@/web-client/detail/StandardDetailMetadataSide";
import {
  buildGroupedAuditFeed,
  resolveAuditActionLabel,
  resolveAuditChangedFieldsSummary,
} from "@/web-client/detail/audit-feed-utils";
import type { DetailShellAuditContext } from "@/web-client/detail/DetailShellEngine";
import type { DetailLayoutConfig } from "@/web-client/registry/types";

const INPUT_CLASS =
  "h-10 rounded-none border-0 border-b border-border/70 bg-transparent px-0 text-sm shadow-none focus-visible:border-primary focus-visible:ring-0";
const TEXTAREA_CLASS =
  "min-h-[180px] rounded-none border-0 border-b border-border/70 bg-transparent px-0 py-3 text-sm shadow-none resize-none focus-visible:border-primary focus-visible:ring-0";
const SECTION_CLASS = "border-y border-border/60 bg-transparent px-0 py-4";

const AUTO_SAVE_EDITING = {
  saveMode: "auto",
  autoSave: {
    trigger: "field-commit",
  },
} as const;

const AUDIT_FIELD_LABELS = {
  name: "Nome",
  description: "Descrição",
  internalNotes: "Notas internas",
  createdAt: "Criado em",
  updatedAt: "Atualizado em",
} as const;

export type ProjectGroupDetailDraft = {
  projectId: string;
  name: string;
  description: string;
  internalNotes: string | null;
};

export type ProjectGroupsDetailLayoutContext = DetailShellAuditContext & {
  mode: "create" | "edit";
  readOnly: boolean;
  canAudit: boolean;
  canManageParticipants: boolean;
  tenantSlug: string;
  project: ApiProject | null;
  projects: ApiProject[];
  group: ApiProjectGroup | null;
  draft: ProjectGroupDetailDraft;
  setDraft: React.Dispatch<React.SetStateAction<ProjectGroupDetailDraft>>;
  rows: ApiProjectEnrollment[];
  historyRows: ApiProjectEnrollment[];
  participantsLoading: boolean;
  onCommitField: <K extends keyof ProjectGroupDetailDraft>(
    field: K,
    nextValue?: ProjectGroupDetailDraft[K],
  ) => void;
  onNotesChange: (next: string | null) => void;
  onNotesBlur: () => void;
  onOpenPerson: (personId: string) => void;
  onCreateParticipant: () => void;
  onEndMembership: (enrollment: ApiProjectEnrollment) => void;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
};

function participantColumns({
  canManageParticipants,
  onEndMembership,
  tenantSlug,
}: Pick<
  ProjectGroupsDetailLayoutContext,
  "canManageParticipants" | "onEndMembership" | "tenantSlug"
>): ColumnDef<ApiProjectEnrollment, unknown>[] {
  return [
    {
      accessorKey: "person.fullName",
      header: "Pessoa",
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
              {row.original.person.status ?? "-"}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "age",
      header: "Idade",
      accessorFn: (row) => getAgeFromBirthDate(row.person.birthDate) ?? null,
      meta: { dataType: "number" },
      cell: ({ row }) => getAgeFromBirthDate(row.original.person.birthDate) ?? "-",
    },
    {
      id: "peopleGroups",
      header: "Grupos de Pessoas",
      accessorFn: (row) => row.peopleGroups.map((item) => item.name).join(", "),
      cell: ({ row }) =>
        row.original.peopleGroups.length
          ? row.original.peopleGroups.map((item) => item.name).join(", ")
          : "Sem grupo de pessoas",
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "ENDED" ? "outline" : "secondary"}>
          {row.original.status === "ENDED" ? "Encerrada" : "Ativa"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        canManageParticipants ? (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-none border-b border-border/60 px-1"
              onClick={(event) => {
                event.stopPropagation();
                onEndMembership(row.original);
              }}
            >
              Encerrar vínculo
            </Button>
          </div>
        ) : null,
    },
  ];
}

function formatHistoryPeriod(row: ApiProjectEnrollment, groupId?: string | null) {
  const membership = row.groupMembershipHistory.find((item) => item.group.id === groupId);
  if (!membership?.startsAt && !membership?.endsAt) return "Período não informado";
  return `${membership?.startsAt?.slice(0, 10) ?? "-"} até ${membership?.endsAt?.slice(0, 10) ?? "-"}`;
}

function ProjectGroupsDetailMain({
  mode,
  project,
  projects,
  draft,
  setDraft,
  readOnly,
  onCommitField,
}: Pick<
  ProjectGroupsDetailLayoutContext,
  "mode" | "project" | "projects" | "draft" | "setDraft" | "readOnly" | "onCommitField"
>) {
  return (
    <div className={SECTION_CLASS}>
      <div className="grid gap-4 md:grid-cols-[1.1fr_1.4fr]">
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Projeto</div>
          {mode === "create" ? (
            <select
              value={draft.projectId}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDraft((previous) => ({ ...previous, projectId: nextValue }));
                onCommitField("projectId", nextValue);
              }}
              className={INPUT_CLASS}
              disabled={readOnly}
            >
              <option value="">Selecione o projeto</option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex h-10 items-end border-b border-border/70 pb-2 text-sm text-foreground">
              {project?.name ?? "-"}
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Nome</div>
          <Input
            value={draft.name}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, name: event.target.value }))
            }
            onBlur={() => onCommitField("name")}
            className={INPUT_CLASS}
            placeholder="Nome do grupo de participantes"
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Descrição</div>
        <Textarea
          value={draft.description}
          onChange={(event) =>
            setDraft((previous) => ({ ...previous, description: event.target.value }))
          }
          onBlur={() => onCommitField("description")}
          className={TEXTAREA_CLASS}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function buildProjectGroupsHistoryItems(
  logs: NonNullable<ProjectGroupsDetailLayoutContext["detailAudit"]>["logs"],
) {
  return buildGroupedAuditFeed(logs).map((group) => {
    const sourceLabel = group.sourceLabels[0] ?? "Registro";
    const actorName =
      group.logs[0]?.user?.name?.trim() ||
      group.logs[0]?.user?.email?.trim() ||
      "Sistema";
    const changedFields = resolveAuditChangedFieldsSummary(group.rows, 3);
    const changedLabel = changedFields.labels.length
      ? changedFields.hiddenCount > 0
        ? `${changedFields.labels.join(", ")} e +${changedFields.hiddenCount}`
        : changedFields.labels.join(", ")
      : null;

    return {
      id: group.id,
      title:
        group.action === "CREATE"
          ? `${sourceLabel} criado`
          : group.action === "DELETE"
            ? `${sourceLabel} removido`
            : `${sourceLabel} atualizado`,
      description: changedLabel ? `${sourceLabel}: ${changedLabel}` : sourceLabel,
      meta: `${resolveAuditActionLabel(group.action)} por ${actorName}`,
      createdAt: group.createdAt,
    };
  });
}

export const projectGroupsDetailLayout: DetailLayoutConfig<ProjectGroupsDetailLayoutContext> = {
  editing: AUTO_SAVE_EDITING,
  header: {
    title: ({ mode, group, draft }) =>
      mode === "create"
        ? "Novo grupo de participantes"
        : group?.name || draft.name || "Grupo de Participantes",
    slot: ({ project }) => (
      <div className="border-y border-border/60 bg-transparent px-0 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Projeto</div>
            <div className="font-medium text-foreground">{project?.name ?? "-"}</div>
          </div>
        </div>
      </div>
    ),
  },
  main: ({ mode, project, projects, draft, setDraft, readOnly, onCommitField }) => (
    <ProjectGroupsDetailMain
      mode={mode}
      project={project}
      projects={projects}
      draft={draft}
      setDraft={setDraft}
      readOnly={readOnly}
      onCommitField={onCommitField}
    />
  ),
  side: ({
    mode,
    canAudit,
    readOnly,
    project,
    draft,
    rows,
    historyRows,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
    onNotesChange,
    onNotesBlur,
  }) => (
    <StandardDetailMetadataSide
      mode={mode}
      canAudit={canAudit}
      readOnly={readOnly}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      notes={{
        value: draft.internalNotes,
        onChange: onNotesChange,
        onBlur: onNotesBlur,
        readOnly,
      }}
      history={{
        items: buildProjectGroupsHistoryItems(detailAudit?.logs ?? []),
        emptyLabel:
          mode === "create"
            ? "Salve para habilitar histórico."
            : "Nenhum histórico.",
      }}
      contextItems={[
        { key: "project", label: "Projeto", value: project?.name ?? "-" },
        { key: "group", label: "Grupo", value: draft.name.trim() || "-" },
        { key: "participants", label: "Participantes ativos", value: rows.length },
        { key: "historyParticipants", label: "Participações encerradas", value: historyRows.length },
      ]}
      defaultTab="activity"
    />
  ),
  tabTemplates: [
    {
      key: "participants",
      label: "Participantes",
      badge: ({ rows }) => rows.length,
      relations: [
        {
          key: "project-group.participants",
          label: "Participantes",
          loading: ({ participantsLoading }) => participantsLoading,
          rows: ({ mode, rows }) => (mode === "edit" ? rows : []),
          columns: (context) =>
            participantColumns({
              canManageParticipants: context.canManageParticipants,
              onEndMembership: context.onEndMembership,
              tenantSlug: context.tenantSlug,
            }),
          getRowId: (row) => row.id,
          onRowClick: (row, context) => context.onOpenPerson(row.person.id),
          action: {
            label: "Vincular participante",
            onClick: (context) => context.onCreateParticipant(),
            hidden: ({ readOnly, mode, canManageParticipants }) =>
              readOnly || mode !== "edit" || !canManageParticipants,
          },
          searchPlaceholder: "Pesquisar",
          filterRows: (rows, query) => {
            const needle = query.trim().toLocaleLowerCase();
            if (!needle) return rows;
            return rows.filter((row) =>
              [
                row.person.fullName,
                row.person.status ?? "",
                row.peopleGroups
                  .map((item: { id: string; name: string; category?: string | null }) => item.name)
                  .join(" "),
                row.groups.map((item: { id: string; name: string }) => item.name).join(" "),
              ]
                .join(" ")
                .toLocaleLowerCase()
                .includes(needle),
            );
          },
          emptyLabel: ({ mode }) =>
            mode === "create"
              ? "Salve para habilitar participantes."
              : "Nenhum participante neste grupo.",
        },
      ],
    },
    {
      key: "historyParticipants",
      label: "Histórico",
      badge: ({ historyRows }) => historyRows.length,
      relations: [
        {
          key: "project-group.history-participants",
          label: "Participações encerradas",
          loading: ({ participantsLoading }) => participantsLoading,
          rows: ({ mode, historyRows }) => (mode === "edit" ? historyRows : []),
          columns: ({ tenantSlug, group }) => [
            {
              accessorKey: "person.fullName",
              header: "Pessoa",
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
                      {row.original.person.status ?? "-"}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: "period",
              header: "Período",
              accessorFn: (row) => formatHistoryPeriod(row, group?.id),
            },
          ],
          getRowId: (row) => row.id,
          onRowClick: (row, context) => context.onOpenPerson(row.person.id),
          searchPlaceholder: "Pesquisar",
          filterRows: (rows, query) => {
            const needle = query.trim().toLocaleLowerCase();
            if (!needle) return rows;
            return rows.filter((row) =>
              [row.person.fullName, row.person.status ?? ""]
                .join(" ")
                .toLocaleLowerCase()
                .includes(needle),
            );
          },
          emptyLabel: ({ mode }) =>
            mode === "create"
              ? "Salve para habilitar histórico."
              : "Nenhum participante encerrado neste grupo.",
        },
      ],
    },
  ],
  auditSources: {
    primaryEntity: {
      key: "projectGroup",
      entity: "ProjectGroup",
      model: "audit.logs",
      label: "Grupo de Participantes",
      fieldLabels: AUDIT_FIELD_LABELS,
      resolveEntityId: ({ group }) => group?.id,
    },
    relatedEntities: [
      {
        key: "projectEnrollmentGroupMembership",
        entity: "ProjectEnrollmentGroupMembership",
        model: "audit.logs",
        label: "Vínculo de grupo",
        fieldLabels: {
          startsAt: "Início",
          endsAt: "Fim",
          isActive: "Status",
          deletedAt: "Encerrado em",
        },
        valueFormatters: {
          isActive: (value) => (value === true ? "Ativo" : "Encerrado"),
        },
        resolveEntityIds: ({ rows, historyRows, group }) =>
          [...rows, ...historyRows]
            .flatMap((row) => row.groupMembershipHistory)
            .filter((membership) => membership.group.id === group?.id)
            .map((membership) => membership.id),
      },
    ],
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};
