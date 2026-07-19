"use client";

import * as React from "react";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import {
  BENEFIT_TYPE_OPTIONS,
  BENEFIT_FREQUENCY_OPTIONS,
  BENEFIT_STATUS_OPTIONS,
  BENEFITS_TEXT,
} from "../config/benefits.constants";

export type BenefitFormValues = {
  type: string;
  status: string;
  amount: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
};

type BenefitEngineValues = Omit<BenefitFormValues, "type"> & {
  typeOption: string;
  typeCustom: string;
};

type BenefitFormProps = {
  initialValues: BenefitFormValues;
  submitLabel: string;
  onSubmit: (values: BenefitFormValues) => void | Promise<void>;
  onValuesChange?: (values: BenefitFormValues) => void;
  onFieldCommit?: (values: BenefitFormValues) => void;
  onCancel?: () => void;
  hideActions?: boolean;
};

const OTHER_VALUE = "__OTHER__";

export function BenefitForm({
  initialValues,
  submitLabel,
  onSubmit,
  onValuesChange,
  onFieldCommit,
  onCancel,
  hideActions = false,
}: BenefitFormProps) {
  const engineInitialValues = React.useMemo<BenefitEngineValues>(() => {
    const isKnown = BENEFIT_TYPE_OPTIONS.some(
      (option) => option.value === initialValues.type,
    );

    return {
      status: initialValues.status,
      amount: initialValues.amount,
      frequency: initialValues.frequency,
      startDate: initialValues.startDate,
      endDate: initialValues.endDate,
      notes: initialValues.notes,
      typeOption: isKnown ? initialValues.type : OTHER_VALUE,
      typeCustom: isKnown ? "" : initialValues.type,
    };
  }, [initialValues]);

  const fields = React.useMemo<FormField<BenefitEngineValues>[]>(
    () => [
      {
        name: "typeOption",
        label: BENEFITS_TEXT.form.typeLabel,
        type: "select",
        options: [
          ...BENEFIT_TYPE_OPTIONS,
          { label: "Outro", value: OTHER_VALUE },
        ],
        required: true,
      },
      {
        name: "typeCustom",
        label: BENEFITS_TEXT.form.typeLabel,
        type: "text",
        placeholder: BENEFITS_TEXT.form.typePlaceholder,
        visibleWhen: (values) => values.typeOption === OTHER_VALUE,
        requiredWhen: (values) => values.typeOption === OTHER_VALUE,
      },
      {
        name: "status",
        label: BENEFITS_TEXT.form.statusLabel,
        type: "select",
        options: BENEFIT_STATUS_OPTIONS,
      },
      {
        name: "frequency",
        label: BENEFITS_TEXT.form.frequencyLabel,
        type: "select",
        options: BENEFIT_FREQUENCY_OPTIONS,
      },
      {
        name: "amount",
        label: BENEFITS_TEXT.form.amountLabel,
        type: "number",
        placeholder: "0.00",
      },
      { name: "startDate", label: BENEFITS_TEXT.form.startDateLabel, type: "date" },
      { name: "endDate", label: BENEFITS_TEXT.form.endDateLabel, type: "date" },
      {
        name: "notes",
        label: BENEFITS_TEXT.form.notesLabel,
        type: "textarea",
        placeholder: BENEFITS_TEXT.form.notesPlaceholder,
        rows: 4,
      },
    ],
    [],
  );

  return (
    <RecordForm<BenefitEngineValues>
      appearance="inline-detail"
      initialValues={engineInitialValues}
      fields={fields}
      onValuesChange={(values) => {
        const resolvedType =
          values.typeOption === OTHER_VALUE
            ? values.typeCustom.trim()
            : values.typeOption;

        onValuesChange?.({
          type: resolvedType,
          status: values.status,
          amount: values.amount,
          frequency: values.frequency,
          startDate: values.startDate,
          endDate: values.endDate,
          notes: values.notes,
        });
      }}
      onFieldCommit={({ values }) => {
        const resolvedType =
          values.typeOption === OTHER_VALUE
            ? values.typeCustom.trim()
            : values.typeOption;

        onFieldCommit?.({
          type: resolvedType,
          status: values.status,
          amount: values.amount,
          frequency: values.frequency,
          startDate: values.startDate,
          endDate: values.endDate,
          notes: values.notes,
        });
      }}
      onSubmit={(values) => {
        const resolvedType =
          values.typeOption === OTHER_VALUE
            ? values.typeCustom.trim()
            : values.typeOption;

        return onSubmit({
          type: resolvedType,
          status: values.status,
          amount: values.amount,
          frequency: values.frequency,
          startDate: values.startDate,
          endDate: values.endDate,
          notes: values.notes,
        });
      }}
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
