"use client";

import { RecordForm } from "@/web-client/forms";
import type { AttendanceFormData } from "@/features/attendances/domain/types";
import {
  attendanceFormFields,
  attendanceFormSteps,
} from "@/features/attendances/config/attendance-form-config";

type AttendanceFormProps = {
  initialValues?: Partial<AttendanceFormData>;
  onSubmit: (values: AttendanceFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function AttendanceForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: AttendanceFormProps) {
  return (
    <RecordForm
      fields={attendanceFormFields}
      steps={attendanceFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
