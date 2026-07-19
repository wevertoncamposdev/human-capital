"use client";

import { RecordForm } from "@/web-client/forms";
import type { IncomeProfileFormData } from "@/features/incomes/domain/types";
import { incomeFormFields, incomeFormSteps } from "@/features/incomes/config/income-form-config";

type IncomeFormProps = {
  initialValues?: Partial<IncomeProfileFormData>;
  onSubmit: (values: IncomeProfileFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function IncomeForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: IncomeFormProps) {
  return (
    <RecordForm
      fields={incomeFormFields}
      steps={incomeFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
