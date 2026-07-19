"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichText } from "@/components/ui/richtext/RichText";
import { resolveMediaUrl } from "@/lib/api";
import type {
  ApiProjectAction,
  ApiProjectActionPeopleParticipation,
  ProjectActionAttendancesListItem,
  ProjectActionInput,
} from "@/modules/actions/api";
import {
  ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS,
  ATTENDANCE_STATUS_OPTIONS,
  ACTION_STATUS_LABELS,
} from "@/modules/actions/shared/domain/actions.constants";
import { ActionCreateFormSection } from "@/modules/actions/features/create/ui/action-create-form-section";
import { ACTION_RELATION_TEXT } from "@/modules/actions/features/manage/config/action-relations.constants";
import { ActionReportPreview } from "@/modules/actions/features/manage/ui/action-report-preview";
import {
  AttendanceNotesDialog,
  QualityNotesDialog,
  buildParticipantsColumns,
  buildQualityColumns,
  countAttendanceHighlights,
  countDistinctAttendanceGroups,
  type AttendanceDraft,
  type AttendanceNotesDialogState,
  type AttendanceStatusFilter,
  type QualityDraft,
  type QualityNotesDialogState,
} from "@/modules/actions/features/manage/ui/action-operational-relations";
import { SectionCard } from "@/components/section-card";
import { StandardDetailMetadataSide } from "@/web-client/detail/StandardDetailMetadataSide";
import {
  buildGroupedAuditFeed,
  resolveAuditActionLabel,
  resolveAuditChangedFieldsSummary,
} from "@/web-client/detail/audit-feed-utils";
import type { DetailShellAuditContext } from "@/web-client/detail/DetailShellEngine";
import type { DetailLayoutConfig } from "@/web-client/registry/types";

const AUTO_SAVE_EDITING = {
  saveMode: "auto",
  autoSave: {
    trigger: "field-commit",
  },
} as const;

const lineInputClassName =
  "h-10 rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0";
const fieldLabelClassName =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground";

const ACTION_AUDIT_FIELD_LABELS = {
  title: "Título",
  description: "Descrição",
  tags: "Tags",
  internalNotes: "Notas internas",
  planHtml: "Planejamento",
  executedHtml: "Execução",
  conclusionHtml: "Conclusão",
  completionPercent: "Progresso",
  photoPaths: "Fotos",
  status: "Status",
  plannedStartAt: "Início planejado",
  plannedEndAt: "Fim planejado",
  executedStartAt: "Início executado",
  executedEndAt: "Fim executado",
  createdAt: "Criado em",
  updatedAt: "Atualizado em",
} as const;

const ACTION_COMMENT_AUDIT_FIELD_LABELS = {
  body: "Comentário",
  mentionUserIds: "Menções",
  createdAt: "Criado em",
  updatedAt: "Atualizado em",
} as const;

const ACTION_ATTACHMENT_AUDIT_FIELD_LABELS = {
  label: "Anexo",
  filePath: "Arquivo",
  mimeType: "Tipo",
  fileSizeBytes: "Tamanho",
  createdAt: "Criado em",
  updatedAt: "Atualizado em",
} as const;

function SectionField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className={fieldLabelClassName}>{label}</div>
      {children}
    </div>
  );
}

function toDateOnly(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "-";
  return ACTION_STATUS_LABELS[value as keyof typeof ACTION_STATUS_LABELS] ?? value;
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined) {
  const from = start ? start.slice(0, 10) : "-";
  const to = end ? end.slice(0, 10) : "-";
  if (!start && !end) return "Não informado";
  return `${from} até ${to}`;
}

function buildActionHistoryItems(logs: NonNullable<ActionsDetailLayoutContext["detailAudit"]>["logs"]) {
  return buildGroupedAuditFeed(logs).map((group) => {
    const primarySource = group.sourceLabels[0] ?? "Registro";
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
          ? `${primarySource} criado`
          : group.action === "DELETE"
            ? `${primarySource} removido`
            : `${primarySource} atualizado`,
      description: changedLabel ? `${primarySource}: ${changedLabel}` : group.sourceLabels.join(", "),
      meta: `${resolveAuditActionLabel(group.action)} por ${actorName}`,
      createdAt: group.createdAt,
    };
  });
}

function filterTeamRows(
  rows: ApiProjectActionPeopleParticipation[],
  query: string,
) {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return rows;
  return rows.filter((row) => {
    const values = [
      row.person.fullName,
      row.person.status,
      ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS[row.role],
      row.enrollment?.role ?? null,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLocaleLowerCase("pt-BR"));
    return values.some((value) => value.includes(normalized));
  });
}

function teamParticipationColumns({
  canUpdate,
  onEndTeamParticipation,
}: {
  canUpdate: boolean;
  onEndTeamParticipation: (participationId: string) => Promise<void>;
}): import("@tanstack/react-table").ColumnDef<ApiProjectActionPeopleParticipation>[] {
  return [
    {
      id: "person",
      header: "Pessoa",
      accessorFn: (row) => row.person.fullName,
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-medium text-foreground">{row.original.person.fullName}</div>
          <div className="text-xs text-muted-foreground">{row.original.person.status ?? "-"}</div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Papel",
      accessorFn: (row) => ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS[row.role],
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS[row.original.role]}
        </span>
      ),
    },
    {
      id: "source",
      header: "Origem",
      accessorFn: (row) => row.enrollment?.role ?? "",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.enrollment?.role ?? "Sem participação ativa no projeto"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        canUpdate ? (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-none border-b border-border/60 px-1"
              onClick={(event) => {
                event.stopPropagation();
                void onEndTeamParticipation(row.original.id);
              }}
            >
              Encerrar
            </Button>
          </div>
        ) : null,
    },
  ];
}

function ActionExecutedSection({
  action,
  readOnly,
  saving,
  onSave,
}: {
  action: ApiProjectAction | null;
  readOnly: boolean;
  saving: boolean;
  onSave: (patch: Partial<ProjectActionInput>) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState({
    executedStartAt: toDateOnly(action?.executedStartAt),
    executedEndAt: toDateOnly(action?.executedEndAt),
    executedHtml: action?.executedHtml ?? "",
  });

  React.useEffect(() => {
    setDraft({
      executedStartAt: toDateOnly(action?.executedStartAt),
      executedEndAt: toDateOnly(action?.executedEndAt),
      executedHtml: action?.executedHtml ?? "",
    });
  }, [action]);

  if (!action) return null;

  return (
    <div className="space-y-6 border-y border-border/60 bg-transparent px-0 py-4">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1.2fr]">
        <SectionField label="Início executado">
          <Input
            type="date"
            value={draft.executedStartAt}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, executedStartAt: event.target.value }))
            }
            className={lineInputClassName}
            readOnly={readOnly || saving}
          />
        </SectionField>
        <SectionField label="Fim executado">
          <Input
            type="date"
            value={draft.executedEndAt}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, executedEndAt: event.target.value }))
            }
            className={lineInputClassName}
            readOnly={readOnly || saving}
          />
        </SectionField>
        <SectionField label="Período executado">
          <div className="flex h-10 items-center border-b border-border/60 text-sm text-foreground">
            {formatPeriod(action.executedStartAt, action.executedEndAt)}
          </div>
        </SectionField>
      </div>

      <SectionField label="Relato da execução">
        <RichText
          value={draft.executedHtml}
          disabled={readOnly || saving}
          onChange={(value) => setDraft((previous) => ({ ...previous, executedHtml: value }))}
        />
      </SectionField>

      {!readOnly ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() =>
              void onSave({
                executedStartAt: draft.executedStartAt.trim() || null,
                executedEndAt: draft.executedEndAt.trim() || null,
                executedHtml: draft.executedHtml.trim() || null,
              })
            }
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar execução"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ActionConclusionSection({
  action,
  readOnly,
  saving,
  onSave,
}: {
  action: ApiProjectAction | null;
  readOnly: boolean;
  saving: boolean;
  onSave: (patch: Partial<ProjectActionInput>) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState({
    completionPercent:
      action?.completionPercent === null || action?.completionPercent === undefined
        ? ""
        : String(action.completionPercent),
    conclusionHtml: action?.conclusionHtml ?? "",
  });

  React.useEffect(() => {
    setDraft({
      completionPercent:
        action?.completionPercent === null || action?.completionPercent === undefined
          ? ""
          : String(action.completionPercent),
      conclusionHtml: action?.conclusionHtml ?? "",
    });
  }, [action]);

  return (
    <div className="space-y-6 border-y border-border/60 bg-transparent px-0 py-4">
      <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
        <SectionField label="% atingido">
          <Input
            type="number"
            min="0"
            max="100"
            value={draft.completionPercent}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, completionPercent: event.target.value }))
            }
            className={lineInputClassName}
            readOnly={readOnly || saving}
          />
        </SectionField>
        <div />
      </div>

      <SectionField label="Conclusão">
        <RichText
          value={draft.conclusionHtml}
          disabled={readOnly || saving}
          onChange={(value) => setDraft((previous) => ({ ...previous, conclusionHtml: value }))}
        />
      </SectionField>

      {!readOnly ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() =>
              void onSave({
                completionPercent: draft.completionPercent.trim()
                  ? Number(draft.completionPercent)
                  : null,
                conclusionHtml: draft.conclusionHtml.trim() || null,
              })
            }
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar conclusão"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ActionPhotosSection({
  action,
  readOnly,
  saving,
  onUploadPhoto,
  onDeletePhoto,
}: {
  action: ApiProjectAction | null;
  readOnly: boolean;
  saving: boolean;
  onUploadPhoto: (file: File) => Promise<void>;
  onDeletePhoto: (path: string) => Promise<void>;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const photoPaths = action?.photoPaths ?? [];

  return (
    <SectionCard title="Fotos">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void onUploadPhoto(file);
          }
        }}
      />

      {!readOnly ? (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {photoPaths.length >= 5 ? "5/5 fotos" : `${photoPaths.length}/5 fotos`}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={saving || photoPaths.length >= 5}
          >
            {saving ? "Enviando..." : "Enviar foto"}
          </Button>
        </div>
      ) : null}

      {photoPaths.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma foto adicionada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photoPaths.map((path) => (
            <div
              key={path}
              className="group relative overflow-hidden rounded-lg border border-border/60 bg-muted/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(path)} alt="Foto da ação" className="h-40 w-full object-cover" />
              {!readOnly ? (
                <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/40 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void onDeletePhoto(path)}
                    disabled={saving}
                  >
                    Remover
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export type ActionMetadataDraft = {
  tags: string[];
  internalNotes: string | null;
};

export type ActionsDetailLayoutContext = DetailShellAuditContext & {
  mode: "create" | "edit";
  readOnly: boolean;
  canAudit: boolean;
  canUpdate: boolean;
  canReadStructure: boolean;
  canReadPeople: boolean;
  canReadPeopleIdentity: boolean;
  tenantSlug: string;
  token: string;
  projectId: string;
  action: ApiProjectAction | null;
  draft: ActionMetadataDraft;
  setDraft: React.Dispatch<React.SetStateAction<ActionMetadataDraft>>;
  mentionableUsers: Array<{
    id: string;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  }>;
  commentDraft: {
    body: string;
    mentionUserIds: string[];
  };
  commentSubmitting: boolean;
  attachmentUploading: boolean;
  photoUploading: boolean;
  reportRows: ProjectActionAttendancesListItem[];
  reportPeopleRows: ApiProjectActionPeopleParticipation[];
  reportLoading: boolean;
  reportError: string | null;
  attendanceGroupId: string;
  attendanceStatusFilter: AttendanceStatusFilter;
  attendanceGroupOptions: Array<{
    label: string;
    value: string;
  }>;
  attendanceDrafts: Record<string, AttendanceDraft>;
  attendanceSaving: boolean;
  attendanceNotesDialog: AttendanceNotesDialogState | null;
  qualityGroupId: string;
  qualityDrafts: Record<string, QualityDraft>;
  qualitySaving: boolean;
  qualityNotesDialog: QualityNotesDialogState | null;
  participantRows: ProjectActionAttendancesListItem[];
  qualityRows: ProjectActionAttendancesListItem[];
  onCommitField: <K extends keyof ActionMetadataDraft>(
    field: K,
    nextValue?: ActionMetadataDraft[K],
  ) => void;
  onCommentDraftChange: React.Dispatch<
    React.SetStateAction<{
      body: string;
      mentionUserIds: string[];
    }>
  >;
  onSubmitComment: () => void;
  onDeleteComment: (commentId: string) => void;
  onUploadAttachment: () => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onNotesChange: (next: string | null) => void;
  onNotesBlur: () => void;
  onSaveActionPatch: (patch: Partial<ProjectActionInput>) => Promise<void>;
  onActionLoaded: (action: ApiProjectAction) => void;
  onUploadPhoto: (file: File) => Promise<void>;
  onDeletePhoto: (path: string) => Promise<void>;
  onOpenTeamPicker: () => void;
  onEndTeamParticipation: (participationId: string) => Promise<void>;
  onAttendanceGroupChange: (value: string) => void;
  onAttendanceStatusFilterChange: (value: AttendanceStatusFilter) => void;
  getAttendanceEffective: (row: ProjectActionAttendancesListItem) => {
    status: import("@/modules/actions/api").AttendanceStatus | null;
    notes: string | null;
  };
  setAttendanceRowDraft: (
    row: ProjectActionAttendancesListItem,
    patch: AttendanceDraft,
    prune?: boolean,
  ) => void;
  applyAttendanceStatusToRows: (
    rows: ProjectActionAttendancesListItem[],
    status: import("@/modules/actions/api").AttendanceStatus,
  ) => void;
  saveAttendanceDrafts: () => void;
  onAttendanceNotesDialogChange: (state: AttendanceNotesDialogState | null) => void;
  applyAttendanceNotesDialog: (state: AttendanceNotesDialogState) => void;
  onQualityGroupChange: (value: string) => void;
  getQualityEffective: (row: ProjectActionAttendancesListItem) => {
    qualityScore: number | null;
    qualityNotes: string | null;
    isHighlight: boolean;
  };
  setQualityRowDraft: (
    row: ProjectActionAttendancesListItem,
    patch: QualityDraft,
    prune?: boolean,
  ) => void;
  saveQualityDrafts: () => void;
  onQualityNotesDialogChange: (state: QualityNotesDialogState | null) => void;
  applyQualityNotesDialog: (state: QualityNotesDialogState) => void;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
};

export const actionsDetailLayout: DetailLayoutConfig<ActionsDetailLayoutContext> = {
  editing: AUTO_SAVE_EDITING,
  main: ({ mode, action, projectId, onActionLoaded }) => {
    return (
      <ActionCreateFormSection
        mode={mode}
        action={action}
        projectId={projectId}
        actionId={action?.id}
        onSaved={onActionLoaded}
      />
    );
  },
  tabTemplates: [
    {
      key: "participants",
      label: ACTION_RELATION_TEXT.participants.tabLabel,
      visible: ({ mode }) => mode === "edit",
      content: ({
        attendanceNotesDialog,
        canUpdate,
        onAttendanceNotesDialogChange,
        applyAttendanceNotesDialog,
      }) => (
        <AttendanceNotesDialog
          state={attendanceNotesDialog}
          canUpdate={canUpdate}
          onOpenChange={(open) => {
            if (!open) onAttendanceNotesDialogChange(null);
          }}
          onStateChange={onAttendanceNotesDialogChange}
          onConfirm={applyAttendanceNotesDialog}
        />
      ),
      relations: [
        {
          key: "participants-attendance",
          label: ACTION_RELATION_TEXT.participants.relationLabel,
          variant: "operational",
          loading: ({ reportLoading }) => reportLoading,
          error: ({ reportError }) => reportError,
          rows: ({ participantRows }) => participantRows,
          columns: ({
            canUpdate,
            canReadPeople,
            tenantSlug,
            getAttendanceEffective,
            setAttendanceRowDraft,
            onAttendanceNotesDialogChange,
          }) =>
            buildParticipantsColumns({
              canUpdate,
              canReadPeople,
              tenantSlug,
              getEffective: getAttendanceEffective,
              onSetRowDraft: setAttendanceRowDraft,
              onOpenNotesDialog: (row) =>
                onAttendanceNotesDialogChange({
                  enrollmentId: row.enrollment.id,
                  fullName: row.enrollment.person.fullName,
                  status: getAttendanceEffective(row).status ?? "",
                  notes: getAttendanceEffective(row).notes ?? "",
                }),
            }),
          getRowId: (row) => row.enrollment.id,
          searchable: true,
          searchPlaceholder: ACTION_RELATION_TEXT.participants.searchPlaceholder,
          filters: [
            {
              key: "group",
              label: ACTION_RELATION_TEXT.participants.groupFilterLabel,
              type: "select",
              value: ({ attendanceGroupId }) => attendanceGroupId,
              onChange: ({ onAttendanceGroupChange }, value) => onAttendanceGroupChange(value),
              options: ({ attendanceGroupOptions }) => attendanceGroupOptions,
            },
            {
              key: "status",
              label: ACTION_RELATION_TEXT.participants.statusFilterLabel,
              type: "select",
              value: ({ attendanceStatusFilter }) => attendanceStatusFilter,
              onChange: ({ onAttendanceStatusFilterChange }, value) =>
                onAttendanceStatusFilterChange(value as AttendanceStatusFilter),
              options: () => [
                {
                  label: ACTION_RELATION_TEXT.participants.allStatuses,
                  value: "all",
                },
                {
                  label: ACTION_RELATION_TEXT.participants.notRecorded,
                  value: "not_recorded",
                },
                ...ATTENDANCE_STATUS_OPTIONS,
              ],
            },
          ],
          stats: [
            {
              key: "total",
              label: ACTION_RELATION_TEXT.participants.stats.total,
              value: ({ reportRows }) => reportRows.length,
            },
            {
              key: "filtered",
              label: ACTION_RELATION_TEXT.participants.stats.filtered,
              value: (_context, rows) => rows.length,
            },
            {
              key: "groups",
              label: ACTION_RELATION_TEXT.participants.stats.groups,
              value: (_context, rows) => countDistinctAttendanceGroups(rows),
            },
            {
              key: "changed",
              label: ACTION_RELATION_TEXT.participants.stats.changed,
              value: ({ attendanceDrafts }) => Object.keys(attendanceDrafts).length,
            },
          ],
          selection: {
            mode: "toggle",
            enabled: ({ canUpdate }) => canUpdate,
            toggleLabel: (_context, active) =>
              active
                ? ACTION_RELATION_TEXT.participants.selectionOff
                : ACTION_RELATION_TEXT.participants.selectionOn,
            bulkActions: [
              {
                key: "present",
                label: ACTION_RELATION_TEXT.participants.bulk.present,
                onClick: ({ applyAttendanceStatusToRows }, rows) =>
                  applyAttendanceStatusToRows(rows, "PRESENT"),
              },
              {
                key: "absent",
                label: ACTION_RELATION_TEXT.participants.bulk.absent,
                variant: "outline",
                onClick: ({ applyAttendanceStatusToRows }, rows) =>
                  applyAttendanceStatusToRows(rows, "ABSENT"),
              },
              {
                key: "excused",
                label: ACTION_RELATION_TEXT.participants.bulk.excused,
                variant: "secondary",
                onClick: ({ applyAttendanceStatusToRows }, rows) =>
                  applyAttendanceStatusToRows(rows, "EXCUSED"),
              },
            ],
          },
          primaryAction: {
            label: ACTION_RELATION_TEXT.participants.save,
            onClick: ({ saveAttendanceDrafts }) => saveAttendanceDrafts(),
            hidden: ({ canUpdate }) => !canUpdate,
            disabled: ({ attendanceDrafts, attendanceSaving }) =>
              attendanceSaving || Object.keys(attendanceDrafts).length === 0,
          },
          emptyLabel: "Sem participantes.",
        },
      ],
      emptyLabel: "Sem participantes.",
    },
    {
      key: "quality",
      label: ACTION_RELATION_TEXT.quality.tabLabel,
      visible: ({ mode }) => mode === "edit",
      content: ({ qualityNotesDialog, canUpdate, onQualityNotesDialogChange, applyQualityNotesDialog }) => (
        <QualityNotesDialog
          state={qualityNotesDialog}
          canUpdate={canUpdate}
          onOpenChange={(open) => {
            if (!open) onQualityNotesDialogChange(null);
          }}
          onStateChange={onQualityNotesDialogChange}
          onConfirm={applyQualityNotesDialog}
        />
      ),
      relations: [
        {
          key: "participants-quality",
          label: ACTION_RELATION_TEXT.quality.relationLabel,
          variant: "operational",
          loading: ({ reportLoading }) => reportLoading,
          error: ({ reportError }) => reportError,
          rows: ({ qualityRows }) => qualityRows,
          columns: ({
            canUpdate,
            canReadPeople,
            tenantSlug,
            getQualityEffective,
            setQualityRowDraft,
            onQualityNotesDialogChange,
          }) =>
            buildQualityColumns({
              canUpdate,
              canReadPeople,
              tenantSlug,
              getEffective: getQualityEffective,
              onSetRowDraft: setQualityRowDraft,
              onOpenNotesDialog: (row) =>
                onQualityNotesDialogChange({
                  enrollmentId: row.enrollment.id,
                  fullName: row.enrollment.person.fullName,
                  qualityNotes: getQualityEffective(row).qualityNotes ?? "",
                }),
            }),
          getRowId: (row) => row.enrollment.id,
          searchable: true,
          searchPlaceholder: ACTION_RELATION_TEXT.quality.searchPlaceholder,
          filters: [
            {
              key: "group",
              label: ACTION_RELATION_TEXT.quality.groupFilterLabel,
              type: "select",
              value: ({ qualityGroupId }) => qualityGroupId,
              onChange: ({ onQualityGroupChange }, value) => onQualityGroupChange(value),
              options: ({ attendanceGroupOptions }) => attendanceGroupOptions,
            },
          ],
          stats: [
            {
              key: "tracked",
              label: ACTION_RELATION_TEXT.quality.stats.tracked,
              value: ({ reportRows }) => reportRows.filter((row) => row.attendance !== null).length,
            },
            {
              key: "filtered",
              label: ACTION_RELATION_TEXT.quality.stats.filtered,
              value: (_context, rows) => rows.length,
            },
            {
              key: "highlights",
              label: ACTION_RELATION_TEXT.quality.stats.highlights,
              value: (_context, rows) => countAttendanceHighlights(rows),
            },
            {
              key: "changed",
              label: ACTION_RELATION_TEXT.quality.stats.changed,
              value: ({ qualityDrafts }) => Object.keys(qualityDrafts).length,
            },
          ],
          primaryAction: {
            label: ACTION_RELATION_TEXT.quality.save,
            onClick: ({ saveQualityDrafts }) => saveQualityDrafts(),
            hidden: ({ canUpdate }) => !canUpdate,
            disabled: ({ qualityDrafts, qualitySaving }) =>
              qualitySaving || Object.keys(qualityDrafts).length === 0,
          },
          emptyLabel: "Nenhuma pessoa com presença registrada.",
        },
      ],
      emptyLabel: "Sem qualidade.",
    },
    {
      key: "team",
      label: "Equipe",
      visible: ({ mode }) => mode === "edit",
      content: () => null,
      relations: [
        {
          key: "team-people",
          label: "Equipe",
          rows: ({ reportPeopleRows }) => reportPeopleRows,
          columns: ({ canUpdate, onEndTeamParticipation }) =>
            teamParticipationColumns({ canUpdate, onEndTeamParticipation }),
          getRowId: (row) => row.id,
          searchable: true,
          searchPlaceholder: "Pesquisar equipe",
          filterRows: (rows, query) => filterTeamRows(rows, query),
          action: {
            label: "Nova pessoa",
            onClick: ({ onOpenTeamPicker }) => onOpenTeamPicker(),
            hidden: ({ canUpdate }) => !canUpdate,
          },
          emptyLabel: "Nenhuma pessoa de apoio registrada.",
        },
      ],
      emptyLabel: "Sem equipe.",
    },
    {
      key: "executed",
      label: "Execução",
      visible: ({ mode }) => mode === "edit",
      content: ({ action, readOnly, attachmentUploading, photoUploading, onSaveActionPatch }) => (
        <ActionExecutedSection
          action={action}
          readOnly={readOnly}
          saving={attachmentUploading || photoUploading}
          onSave={onSaveActionPatch}
        />
      ),
      emptyLabel: "Sem execução.",
    },
    {
      key: "conclusion",
      label: "Conclusão",
      visible: ({ mode }) => mode === "edit",
      content: ({ action, readOnly, attachmentUploading, photoUploading, onSaveActionPatch }) => (
        <ActionConclusionSection
          action={action}
          readOnly={readOnly}
          saving={attachmentUploading || photoUploading}
          onSave={onSaveActionPatch}
        />
      ),
      emptyLabel: "Sem conclusão.",
    },
    {
      key: "photos",
      label: "Fotos",
      visible: ({ mode }) => mode === "edit",
      content: ({ action, readOnly, photoUploading, onUploadPhoto, onDeletePhoto }) => (
        <ActionPhotosSection
          action={action}
          readOnly={readOnly}
          saving={photoUploading}
          onUploadPhoto={onUploadPhoto}
          onDeletePhoto={onDeletePhoto}
        />
      ),
      emptyLabel: "Sem fotos.",
    },
    {
      key: "report",
      label: "Relatório",
      visible: ({ mode }) => mode === "edit",
      content: ({ action, reportRows, reportPeopleRows, reportLoading, reportError, canReadPeople }) => (
        <SectionCard title="Relatório">
          {reportError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {reportError}
            </div>
          ) : null}
          {reportLoading ? <p className="text-xs text-muted-foreground">Carregando...</p> : null}
          {action ? (
            <ActionReportPreview
              action={action}
              rows={reportRows}
              peopleParticipations={reportPeopleRows}
              photoPaths={action.photoPaths ?? []}
              canShowPeople={canReadPeople}
            />
          ) : null}
        </SectionCard>
      ),
      emptyLabel: "Sem relatório.",
    },
  ],
  side: ({
    mode,
    canAudit,
    readOnly,
    action,
    draft,
    setDraft,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
    mentionableUsers,
    commentDraft,
    commentSubmitting,
    attachmentUploading,
    onCommitField,
    onCommentDraftChange,
    onSubmitComment,
    onDeleteComment,
    onUploadAttachment,
    onDeleteAttachment,
    onNotesChange,
    onNotesBlur,
  }) => (
    <StandardDetailMetadataSide
      mode={mode}
      readOnly={readOnly}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      canAudit={canAudit}
      comments={{
        items: action?.comments ?? [],
        draft: commentDraft,
        users: mentionableUsers,
        onDraftChange: onCommentDraftChange,
        onSubmit: onSubmitComment,
        onDelete: mode === "edit" ? onDeleteComment : undefined,
        submitting: commentSubmitting,
        readOnly: readOnly || mode !== "edit",
        emptyLabel:
          mode === "create"
            ? "Salve para habilitar comentários."
            : "Nenhum comentário.",
      }}
      notes={{
        value: draft.internalNotes,
        onChange: onNotesChange,
        onBlur: onNotesBlur,
        readOnly,
      }}
      tags={{
        value: draft.tags,
        onChange: (nextTags) => setDraft((previous) => ({ ...previous, tags: nextTags })),
        onCommit: (next) => onCommitField("tags", next),
        readOnly,
        emptyLabel: mode === "create" ? "Salve para habilitar tags." : "Nenhuma tag.",
      }}
      attachments={{
        items: (action?.attachments ?? []).map((attachment) => ({
          id: attachment.id,
          label: attachment.label,
          href: resolveMediaUrl(attachment.filePath),
          description: attachment.uploadedBy?.name
            ? `Enviado por ${attachment.uploadedBy.name}`
            : "Anexo da ação",
          mimeType: attachment.mimeType ?? null,
          sizeLabel:
            typeof attachment.fileSizeBytes === "number" && attachment.fileSizeBytes > 0
              ? attachment.fileSizeBytes >= 1024 * 1024
                ? `${(attachment.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                : attachment.fileSizeBytes >= 1024
                  ? `${Math.round(attachment.fileSizeBytes / 1024)} KB`
                  : `${attachment.fileSizeBytes} B`
              : null,
          statusLabel: attachment.createdAt ? attachment.createdAt.slice(0, 16).replace("T", ", ") : null,
        })),
        onUpload: mode === "edit" && !readOnly ? onUploadAttachment : undefined,
        onDelete: mode === "edit" && !readOnly ? onDeleteAttachment : undefined,
        readOnly: readOnly || mode !== "edit",
        emptyLabel:
          mode === "create"
            ? "Salve para habilitar anexos."
            : attachmentUploading
              ? "Enviando anexo..."
              : "Nenhum anexo.",
      }}
      history={{
        items: buildActionHistoryItems(detailAudit?.logs ?? []),
        emptyLabel:
          mode === "create"
            ? "Salve para habilitar histórico."
            : "Nenhum histórico.",
      }}
      contextItems={[
        { key: "status", label: "Status", value: formatStatus(action?.status) },
        { key: "type", label: "Tipo", value: action?.actionType?.name ?? "-" },
        {
          key: "scope",
          label: "Escopo",
          value:
            action?.projectGroup?.name ??
            action?.peopleGroup?.name ??
            action?.targetEnrollment?.person?.fullName ??
            "Projeto",
        },
        { key: "period", label: "Período", value: formatPeriod(action?.plannedStartAt, action?.plannedEndAt) },
        { key: "tags", label: "Tags", value: draft.tags.length },
      ]}
      defaultTab="activity"
    />
  ),
  auditSources: {
    primaryEntity: {
      key: "action",
      entity: "ProjectAction",
      model: "audit.logs",
      label: "Ação",
      fieldLabels: ACTION_AUDIT_FIELD_LABELS,
      valueFormatters: {
        status: (value) => formatStatus(typeof value === "string" ? value : null),
      },
      resolveEntityId: ({ action }) => action?.id,
    },
    relatedEntities: [
      {
        key: "actionComment",
        entity: "ProjectActionComment",
        model: "audit.logs",
        label: "Comentário",
        fieldLabels: ACTION_COMMENT_AUDIT_FIELD_LABELS,
        resolveEntityIds: ({ action }) => (action?.comments ?? []).map((comment) => comment.id),
      },
      {
        key: "actionAttachment",
        entity: "ProjectActionAttachment",
        model: "audit.logs",
        label: "Anexo",
        fieldLabels: ACTION_ATTACHMENT_AUDIT_FIELD_LABELS,
        resolveEntityIds: ({ action }) => (action?.attachments ?? []).map((attachment) => attachment.id),
      },
    ],
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};
