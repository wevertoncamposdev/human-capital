"use client";

import { RecordForm } from "@/web-client/forms";
import {
  occurrenceFormFields,
  occurrenceFormSteps,
  type OccurrenceFormValues,
} from "@/features/occurrences/config/occurrence-form-config";

type OccurrenceFormProps = {
  initialValues?: Partial<OccurrenceFormValues>;
  onSubmit: (values: OccurrenceFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function OccurrenceForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: OccurrenceFormProps) {
  return (
    <RecordForm
      fields={occurrenceFormFields}
      steps={occurrenceFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
