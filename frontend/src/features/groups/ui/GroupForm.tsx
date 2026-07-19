"use client";

import { RecordForm } from "@/web-client/forms";
import type { GroupFormData } from "../domain/types";
import { groupFormFields, groupFormSteps } from "../config/group-form-config";

type GroupFormProps = {
  initialValues?: Partial<GroupFormData>;
  onSubmit: (values: GroupFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function GroupForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: GroupFormProps) {
  return (
    <RecordForm
      fields={groupFormFields}
      steps={groupFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
