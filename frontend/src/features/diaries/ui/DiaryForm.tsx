"use client";

import { RecordForm } from "@/web-client/forms";
import type { DiaryEntryFormData } from "@/features/diaries/domain/types";
import {
  diaryFormFields,
  diaryFormSteps,
} from "@/features/diaries/config/diary-form-config";

type DiaryFormProps = {
  initialValues?: Partial<DiaryEntryFormData>;
  onSubmit: (values: DiaryEntryFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function DiaryForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: DiaryFormProps) {
  return (
    <RecordForm
      fields={diaryFormFields}
      steps={diaryFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
