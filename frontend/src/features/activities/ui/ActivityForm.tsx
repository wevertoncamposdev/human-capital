"use client";

import { RecordForm } from "@/web-client/forms";
import type { ActivityFormData } from "@/features/activities/domain/types";
import {
  activityFormFields,
  activityFormSteps,
} from "@/features/activities/config/activity-form-config";

type ActivityFormProps = {
  initialValues?: Partial<ActivityFormData>;
  onSubmit: (values: ActivityFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function ActivityForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: ActivityFormProps) {
  return (
    <RecordForm
      fields={activityFormFields}
      steps={activityFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
