"use client";

import { RecordForm } from "@/web-client/forms";
import type { PresenceFormData } from "@/features/presences/domain/types";
import {
  presenceFormFields,
  presenceFormSteps,
} from "@/features/presences/config/presence-form-config";

type PresenceFormProps = {
  initialValues?: Partial<PresenceFormData>;
  onSubmit: (values: PresenceFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function PresenceForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: PresenceFormProps) {
  return (
    <RecordForm
      fields={presenceFormFields}
      steps={presenceFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
