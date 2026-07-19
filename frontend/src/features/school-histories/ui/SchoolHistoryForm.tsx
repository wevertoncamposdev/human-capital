"use client";

import { RecordForm } from "@/web-client/forms";
import type { SchoolHistoryFormData } from "@/features/school-histories/domain/types";
import {
  schoolHistoryFormFields,
  schoolHistoryFormSteps,
} from "@/features/school-histories/config/school-history-form-config";

type SchoolHistoryFormProps = {
  initialValues?: Partial<SchoolHistoryFormData>;
  onSubmit: (values: SchoolHistoryFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function SchoolHistoryForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: SchoolHistoryFormProps) {
  return (
    <RecordForm
      fields={schoolHistoryFormFields}
      steps={schoolHistoryFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
