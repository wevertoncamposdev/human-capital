"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionDialog } from "@/components/section-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  AttendanceStatus,
  ProjectActionAttendancesListItem,
} from "@/modules/actions/api";
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_OPTIONS,
} from "@/modules/actions/shared/domain/actions.constants";
import { ACTION_RELATION_TEXT, ACTION_RELATION_VALUES } from "../config/action-relations.constants";
import {
  GENDER_LABELS,
  RACE_COLOR_LABELS,
  SEX_LABELS,
  getAgeFromBirthDate,
  resolveLabel,
} from "@/modules/people/shared/domain/utils";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";

export type AttendanceDraft = {
  status?: AttendanceStatus;
  notes?: string | null;
};

export type AttendanceStatusFilter = "all" | "not_recorded" | AttendanceStatus;

export type AttendanceNotesDialogState = {
  enrollmentId: string;
  fullName: string;
  status: AttendanceStatus | "";
  notes: string;
};

export type QualityDraft = {
  qualityScore?: number | null;
  qualityNotes?: string | null;
  isHighlight?: boolean;
};

export type QualityNotesDialogState = {
  enrollmentId: string;
  fullName: string;
  qualityNotes: string;
};

export type RelationGroupOption = {
  label: string;
  value: string;
};

type AttendanceEffectiveState = {
  status: AttendanceStatus | null;
  notes: string | null;
};

type QualityEffectiveState = {
  qualityScore: number | null;
  qualityNotes: string | null;
  isHighlight: boolean;
};

const SCORE_OPTIONS = [
  { label: "Sem nota", value: ACTION_RELATION_VALUES.noScore },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
] as const;

function resolveAttendanceBadge(status: AttendanceStatus) {
  const label = ATTENDANCE_STATUS_LABELS[status] ?? status;
  switch (status) {
    case "ABSENT":
      return <Badge variant="outline">{label}</Badge>;
    case "EXCUSED":
      return <Badge variant="secondary">{label}</Badge>;
    case "PRESENT":
    default:
      return <Badge className="border-transparent bg-emerald-600 text-white">{label}</Badge>;
  }
}

function renderParticipantIdentity({
  row,
  tenantSlug,
  canReadPeople,
}: {
  row: ProjectActionAttendancesListItem;
  tenantSlug: string;
  canReadPeople: boolean;
}) {
  const person = row.enrollment.person;
  return (
    <div className="flex items-center gap-3">
      <PersonIdentityAvatarTrigger
        personId={person.id}
        tenantSlug={tenantSlug}
        fullName={person.fullName}
        birthDate={person.birthDate ?? null}
        avatarUrl={person.avatarUrl ?? null}
        hasHealthCondition={person.hasHealthCondition}
        hasMedication={person.hasMedication}
        showDetailsLink={canReadPeople}
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{person.fullName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {row.enrollment.groups.map((group) => group.name).join(", ") || "—"}
        </span>
      </div>
    </div>
  );
}

export function buildAttendanceGroupOptions(
  rows: ProjectActionAttendancesListItem[],
): RelationGroupOption[] {
  const groups = Array.from(
    new Map(
      rows
        .flatMap((row) => row.enrollment.groups)
        .map((group) => [group.id, { label: group.name, value: group.id }] as const),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return [
    { label: ACTION_RELATION_TEXT.participants.allGroups, value: ACTION_RELATION_VALUES.allGroups },
    ...groups,
  ];
}

export function filterAttendanceRows(
  rows: ProjectActionAttendancesListItem[],
  filters: {
    groupId: string;
    status: AttendanceStatusFilter;
  },
) {
  return rows.filter((row) => {
    const matchesGroup =
      filters.groupId === ACTION_RELATION_VALUES.allGroups ||
      row.enrollment.groups.some((group) => group.id === filters.groupId);
    if (!matchesGroup) return false;

    if (filters.status === "all") return true;
    if (filters.status === "not_recorded") return row.attendance === null;
    return row.attendance?.status === filters.status;
  });
}

export function filterQualityRows(
  rows: ProjectActionAttendancesListItem[],
  filters: {
    groupId: string;
  },
) {
  return rows.filter((row) => {
    if (row.attendance === null) return false;
    if (filters.groupId === ACTION_RELATION_VALUES.allGroups) return true;
    return row.enrollment.groups.some((group) => group.id === filters.groupId);
  });
}

export function countDistinctAttendanceGroups(rows: ProjectActionAttendancesListItem[]) {
  return new Set(rows.flatMap((row) => row.enrollment.groups.map((group) => group.id))).size;
}

export function countAttendanceHighlights(rows: ProjectActionAttendancesListItem[]) {
  return rows.filter((row) => row.attendance?.isHighlight).length;
}

export function buildParticipantsColumns({
  canUpdate,
  canReadPeople,
  tenantSlug,
  getEffective,
  onSetRowDraft,
  onOpenNotesDialog,
}: {
  canUpdate: boolean;
  canReadPeople: boolean;
  tenantSlug: string;
  getEffective: (row: ProjectActionAttendancesListItem) => AttendanceEffectiveState;
  onSetRowDraft: (
    row: ProjectActionAttendancesListItem,
    patch: AttendanceDraft,
    prune?: boolean,
  ) => void;
  onOpenNotesDialog: (row: ProjectActionAttendancesListItem) => void;
}): ColumnDef<ProjectActionAttendancesListItem>[] {
  return [
    {
      id: "person",
      header: ACTION_RELATION_TEXT.participants.columns.person,
      accessorFn: (row) => row.enrollment.person.fullName,
      cell: ({ row }) =>
        renderParticipantIdentity({
          row: row.original,
          tenantSlug,
          canReadPeople,
        }),
    },
    {
      id: "age",
      header: ACTION_RELATION_TEXT.participants.columns.age,
      accessorFn: (row) => getAgeFromBirthDate(row.enrollment.person.birthDate),
      cell: ({ row }) => getAgeFromBirthDate(row.original.enrollment.person.birthDate) ?? "—",
    },
    {
      id: "sex",
      header: ACTION_RELATION_TEXT.participants.columns.sex,
      accessorFn: (row) => row.enrollment.person.sex ?? "",
      cell: ({ row }) => resolveLabel(row.original.enrollment.person.sex, SEX_LABELS),
    },
    {
      id: "gender",
      header: ACTION_RELATION_TEXT.participants.columns.gender,
      accessorFn: (row) => row.enrollment.person.gender ?? "",
      cell: ({ row }) => resolveLabel(row.original.enrollment.person.gender, GENDER_LABELS),
    },
    {
      id: "raceColor",
      header: ACTION_RELATION_TEXT.participants.columns.raceColor,
      accessorFn: (row) => row.enrollment.person.raceColor ?? "",
      cell: ({ row }) =>
        resolveLabel(row.original.enrollment.person.raceColor, RACE_COLOR_LABELS),
    },
    {
      id: "peopleGroups",
      header: ACTION_RELATION_TEXT.participants.columns.peopleGroups,
      accessorFn: (row) => row.enrollment.peopleGroups.map((group) => group.name).join(", "),
      cell: ({ row }) =>
        row.original.enrollment.peopleGroups.map((group) => group.name).join(", ") || "—",
    },
    {
      id: "attendance",
      header: ACTION_RELATION_TEXT.participants.columns.attendance,
      accessorFn: (row) => row.attendance?.status ?? "",
      cell: ({ row }) => {
        const effective = getEffective(row.original);
        if (!canUpdate) {
          return effective.status ? resolveAttendanceBadge(effective.status) : "—";
        }

        return (
          <div className="flex items-center gap-2">
            <Select
              value={effective.status ?? ""}
              onValueChange={(value) =>
                onSetRowDraft(row.original, { status: value as AttendanceStatus }, true)
              }
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder={ACTION_RELATION_TEXT.participants.notRecorded} />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={ACTION_RELATION_TEXT.participants.notesTitle}
              aria-label={ACTION_RELATION_TEXT.participants.notesTitle}
              onClick={() => onOpenNotesDialog(row.original)}
            >
              <NotebookPen className="size-4" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "notes",
      header: ACTION_RELATION_TEXT.participants.columns.notes,
      accessorFn: (row) => row.attendance?.notes ?? "",
      cell: ({ row }) => {
        const effective = getEffective(row.original);
        const text = effective.notes?.trim() ?? "";
        return text ? <span className="line-clamp-1">{text}</span> : "—";
      },
    },
  ];
}

export function buildQualityColumns({
  canUpdate,
  canReadPeople,
  tenantSlug,
  getEffective,
  onSetRowDraft,
  onOpenNotesDialog,
}: {
  canUpdate: boolean;
  canReadPeople: boolean;
  tenantSlug: string;
  getEffective: (row: ProjectActionAttendancesListItem) => QualityEffectiveState;
  onSetRowDraft: (
    row: ProjectActionAttendancesListItem,
    patch: QualityDraft,
    prune?: boolean,
  ) => void;
  onOpenNotesDialog: (row: ProjectActionAttendancesListItem) => void;
}): ColumnDef<ProjectActionAttendancesListItem>[] {
  return [
    {
      id: "person",
      header: ACTION_RELATION_TEXT.quality.columns.person,
      accessorFn: (row) => row.enrollment.person.fullName,
      cell: ({ row }) =>
        renderParticipantIdentity({
          row: row.original,
          tenantSlug,
          canReadPeople,
        }),
    },
    {
      id: "score",
      header: ACTION_RELATION_TEXT.quality.columns.score,
      accessorFn: (row) => row.attendance?.qualityScore ?? "",
      cell: ({ row }) => {
        const effective = getEffective(row.original);
        const selectValue =
          effective.qualityScore === null || effective.qualityScore === undefined
            ? ACTION_RELATION_VALUES.noScore
            : String(effective.qualityScore);

        return (
          <Select
            value={selectValue}
            onValueChange={(next) => {
              const parsed =
                next === ACTION_RELATION_VALUES.noScore
                  ? null
                  : Math.min(5, Math.max(1, Number(next)));
              onSetRowDraft(row.original, { qualityScore: parsed }, true);
            }}
            disabled={!canUpdate}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCORE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: "highlight",
      header: ACTION_RELATION_TEXT.quality.columns.highlight,
      accessorFn: (row) => (row.attendance?.isHighlight ? 1 : 0),
      cell: ({ row }) => {
        const effective = getEffective(row.original);
        return (
          <div className="flex items-center justify-center">
            <Switch
              checked={Boolean(effective.isHighlight)}
              onCheckedChange={(checked) =>
                onSetRowDraft(row.original, { isHighlight: Boolean(checked) }, true)
              }
              disabled={!canUpdate}
            />
          </div>
        );
      },
    },
    {
      id: "notes",
      header: ACTION_RELATION_TEXT.quality.columns.notes,
      accessorFn: (row) => row.attendance?.qualityNotes ?? "",
      cell: ({ row }) => {
        const effective = getEffective(row.original);
        return (
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-xs"
            disabled={!canUpdate}
            onClick={() => onOpenNotesDialog(row.original)}
          >
            {effective.qualityNotes?.trim()
              ? ACTION_RELATION_TEXT.quality.editNote
              : ACTION_RELATION_TEXT.quality.addNote}
          </Button>
        );
      },
    },
  ];
}

export function AttendanceNotesDialog({
  state,
  canUpdate,
  onOpenChange,
  onStateChange,
  onConfirm,
}: {
  state: AttendanceNotesDialogState | null;
  canUpdate: boolean;
  onOpenChange: (open: boolean) => void;
  onStateChange: (state: AttendanceNotesDialogState) => void;
  onConfirm: (state: AttendanceNotesDialogState) => void;
}) {
  return (
    <SectionDialog
      open={Boolean(state)}
      onOpenChange={onOpenChange}
      title={ACTION_RELATION_TEXT.participants.notesTitle}
      description={ACTION_RELATION_TEXT.participants.notesDescription}
      contentClassName="max-w-[720px]"
    >
      {state ? (
        <div className="flex flex-col gap-4">
          <div className="text-sm">
            Participante: <strong>{state.fullName}</strong>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={state.status}
                onValueChange={(value) =>
                  onStateChange({
                    ...state,
                    status: value as AttendanceStatus,
                  })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{ACTION_RELATION_TEXT.participants.notesLabel}</Label>
            <Textarea
              rows={4}
              value={state.notes}
              onChange={(event) => onStateChange({ ...state, notes: event.target.value })}
              placeholder={ACTION_RELATION_TEXT.participants.notesPlaceholder}
              readOnly={!canUpdate}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {ACTION_RELATION_TEXT.participants.cancel}
            </Button>
            <Button type="button" disabled={!canUpdate} onClick={() => onConfirm(state)}>
              {ACTION_RELATION_TEXT.participants.apply}
            </Button>
          </div>
        </div>
      ) : null}
    </SectionDialog>
  );
}

export function QualityNotesDialog({
  state,
  canUpdate,
  onOpenChange,
  onStateChange,
  onConfirm,
}: {
  state: QualityNotesDialogState | null;
  canUpdate: boolean;
  onOpenChange: (open: boolean) => void;
  onStateChange: (state: QualityNotesDialogState) => void;
  onConfirm: (state: QualityNotesDialogState) => void;
}) {
  return (
    <SectionDialog
      open={Boolean(state)}
      onOpenChange={onOpenChange}
      title={ACTION_RELATION_TEXT.quality.notesTitle}
      description={state?.fullName ?? ""}
      contentClassName="max-w-[min(96vw,38rem)]"
    >
      {state ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {ACTION_RELATION_TEXT.quality.notesLabel}
            </div>
            <Textarea
              rows={5}
              value={state.qualityNotes}
              onChange={(event) => onStateChange({ ...state, qualityNotes: event.target.value })}
              className="min-h-[140px] rounded-none border-0 border-b border-border/60 bg-transparent px-0 py-3 shadow-none resize-none focus-visible:border-primary focus-visible:ring-0"
              readOnly={!canUpdate}
            />
          </div>
          {canUpdate ? (
            <div className="flex justify-end">
              <Button type="button" onClick={() => onConfirm(state)}>
                Salvar
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionDialog>
  );
}
