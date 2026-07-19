"use client";

import * as React from "react";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import { DETENTIONS_TEXT } from "../config/detentions.constants";

export type DetentionFormValues = {
  status: string;
  type: string;
  unit: string;
  startDate: string;
  endDate: string;
  notes: string;
};

type DetentionFormProps = {
  initialValues: DetentionFormValues;
  submitLabel: string;
  onSubmit: (values: DetentionFormValues) => void | Promise<void>;
  onValuesChange?: (values: DetentionFormValues) => void;
  onFieldCommit?: (values: DetentionFormValues) => void;
  onCancel?: () => void;
  hideActions?: boolean;
};

export function DetentionForm({
  initialValues,
  submitLabel,
  onSubmit,
  onValuesChange,
  onFieldCommit,
  onCancel,
  hideActions = false,
}: DetentionFormProps) {
  const fields = React.useMemo<FormField<DetentionFormValues>[]>(
    () => [
      {
        name: "status",
        label: DETENTIONS_TEXT.form.statusLabel,
        type: "text",
        placeholder: DETENTIONS_TEXT.form.statusPlaceholder,
      },
      {
        name: "type",
        label: DETENTIONS_TEXT.form.typeLabel,
        type: "text",
        placeholder: DETENTIONS_TEXT.form.typePlaceholder,
      },
      {
        name: "unit",
        label: DETENTIONS_TEXT.form.unitLabel,
        type: "text",
        placeholder: DETENTIONS_TEXT.form.unitPlaceholder,
      },
      { name: "startDate", label: DETENTIONS_TEXT.form.startDateLabel, type: "date" },
      { name: "endDate", label: DETENTIONS_TEXT.form.endDateLabel, type: "date" },
      {
        name: "notes",
        label: DETENTIONS_TEXT.form.notesLabel,
        type: "textarea",
        placeholder: DETENTIONS_TEXT.form.notesPlaceholder,
        rows: 4,
      },
    ],
    [],
  );

  return (
    <RecordForm<DetentionFormValues>
      appearance="inline-detail"
      initialValues={initialValues}
      fields={fields}
      onValuesChange={onValuesChange}
      onFieldCommit={({ values }) => onFieldCommit?.(values)}
      onSubmit={onSubmit}
      actions={
        hideActions
          ? undefined
          : {
              cancel: onCancel
                ? { label: "Cancelar", onClick: onCancel, variant: "ghost" }
                : undefined,
              submit: { label: submitLabel, variant: "primary" },
            }
      }
    />
  );
}
