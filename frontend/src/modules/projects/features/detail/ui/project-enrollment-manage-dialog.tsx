"use client";

import * as React from "react";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import { SectionDialog } from "@/components/section-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  updateProjectEnrollment,
  type ApiProjectEnrollment,
  type EnrollmentStatus,
  type ProjectParticipationRole,
} from "@/modules/projects/api";
import {
  ENROLLMENT_STATUS_OPTIONS,
  PROJECT_PARTICIPATION_ROLE_OPTIONS,
} from "@/modules/projects/shared/domain/projects.constants";

type EnrollmentDialogValues = {
  status: EnrollmentStatus;
  role: ProjectParticipationRole;
  startsAt: string;
  endsAt: string;
};

const ENROLLMENT_FIELDS: FormField<EnrollmentDialogValues>[] = [
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
  {
    name: "startsAt",
    label: "In\u00edcio",
    type: "date",
  },
  {
    name: "endsAt",
    label: "T\u00e9rmino",
    type: "date",
  },
];

type ProjectEnrollmentManageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  projectId: string;
  enrollment: ApiProjectEnrollment | null;
  onCompleted?: () => void | Promise<void>;
};

export function ProjectEnrollmentManageDialog({
  open,
  onOpenChange,
  token,
  projectId,
  enrollment,
  onCompleted,
}: ProjectEnrollmentManageDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const initialValues = React.useMemo<Partial<EnrollmentDialogValues>>(() => {
    if (!enrollment) {
      return {
        status: "ACTIVE",
        role: "PUBLICO_ATENDIDO",
        startsAt: "",
        endsAt: "",
      };
    }

    return {
      status: enrollment.status,
      role: enrollment.role,
      startsAt: enrollment.startsAt ? enrollment.startsAt.slice(0, 10) : "",
      endsAt: enrollment.endsAt ? enrollment.endsAt.slice(0, 10) : "",
    };
  }, [enrollment]);

  const handleSubmit = React.useCallback(
    async (values: EnrollmentDialogValues) => {
      if (!enrollment) return;

      setSaving(true);
      setFormError(null);
      try {
        await updateProjectEnrollment(token, projectId, enrollment.id, {
          status: values.status,
          role: values.role,
          startsAt: values.startsAt.trim() ? values.startsAt.trim() : null,
          endsAt: values.endsAt.trim() ? values.endsAt.trim() : null,
        });
        toast({ title: "Matr\u00edcula atualizada" });
        await onCompleted?.();
        onOpenChange(false);
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao salvar matr\u00edcula.";
        setFormError(message);
      } finally {
        setSaving(false);
      }
    },
    [enrollment, onCompleted, onOpenChange, projectId, toast, token],
  );

  if (!enrollment) {
    return null;
  }

  const groupsLabel =
    enrollment.groups.map((group) => group.name).join(", ") || "Sem grupo";
  const peopleGroupsLabel =
    enrollment.peopleGroups.map((group) => group.name).join(", ") ||
    "Sem grupo de pessoas";

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={enrollment.person.fullName}
      contentClassName="max-w-[820px]"
    >
      <div className="grid gap-3 border-b border-border/60 pb-4 md:grid-cols-2">
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Pessoa
          </div>
          <div className="text-sm font-medium text-foreground">
            {enrollment.person.fullName}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Situa\u00e7\u00e3o atual
          </div>
          <div className="text-sm text-foreground">
            {enrollment.status === "ACTIVE" ? "Ativa" : "Encerrada"}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Grupos
          </div>
          <div className="text-sm text-foreground">{groupsLabel}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Grupos de Pessoas
          </div>
          <div className="text-sm text-foreground">{peopleGroupsLabel}</div>
        </div>
      </div>

      {formError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <RecordForm<EnrollmentDialogValues>
        fields={ENROLLMENT_FIELDS}
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
            onClick: () => onOpenChange(false),
          },
        }}
      />
    </SectionDialog>
  );
}
