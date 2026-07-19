"use client";

import * as React from "react";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import {
  FINANCIAL_CATEGORY_OPTIONS,
  FINANCIAL_CONTRACT_TYPE_OPTIONS,
  FINANCIAL_ENTRY_TYPE_OPTIONS,
  FINANCIAL_FREQUENCY_OPTIONS,
  FINANCIAL_STATUS_OPTIONS,
} from "@/modules/people/features/people-financial/config/people-financial.constants";
import type { PersonFinancialEntryType } from "@/modules/people/shared/domain/types";

export type FinancialEntryFormValues = {
  entryType: PersonFinancialEntryType;
  category: string;
  subcategory: string;
  status: string;
  amount: string;
  frequency: string;
  contractType: string;
  householdId: string;
  fromHouseholdId: string;
  toHouseholdId: string;
  includeInHouseholdBudget: boolean;
  startDate: string;
  endDate: string;
  notes: string;
};

type Props = {
  initialValues: FinancialEntryFormValues;
  householdOptions: { value: string; label: string }[];
  onSubmit: (values: FinancialEntryFormValues) => void | Promise<void>;
  onValuesChange?: (values: FinancialEntryFormValues) => void;
  onFieldCommit?: (values: FinancialEntryFormValues) => void;
};

export function FinancialEntryForm({
  initialValues,
  householdOptions,
  onSubmit,
  onValuesChange,
  onFieldCommit,
}: Props) {
  const fields = React.useMemo<FormField<FinancialEntryFormValues>[]>(() => {
    const categoryOptions = Object.entries(FINANCIAL_CATEGORY_OPTIONS).flatMap(
      ([type, options]) =>
        options.map((option) => ({
          value: option.value,
          label: `${option.label} (${FINANCIAL_ENTRY_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type})`,
        })),
    );

    return [
      {
        name: "entryType",
        label: "Tipo",
        type: "select",
        required: true,
        options: FINANCIAL_ENTRY_TYPE_OPTIONS,
      },
      {
        name: "category",
        label: "Categoria",
        type: "select",
        required: true,
        options: categoryOptions,
      },
      {
        name: "subcategory",
        label: "Subcategoria",
        type: "text",
        placeholder: "Detalhe ou classificacao complementar",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: FINANCIAL_STATUS_OPTIONS,
        visibleWhen: (values) => values.entryType === "BENEFIT",
      },
      {
        name: "amount",
        label: "Valor",
        type: "text",
        placeholder: "0.00",
      },
      {
        name: "frequency",
        label: "Frequencia",
        type: "select",
        options: FINANCIAL_FREQUENCY_OPTIONS,
      },
      {
        name: "contractType",
        label: "Forma contratual",
        type: "select",
        options: FINANCIAL_CONTRACT_TYPE_OPTIONS,
        visibleWhen: (values) => values.entryType === "INCOME",
      },
      {
        name: "householdId",
        label: "Familia",
        type: "select",
        options: householdOptions,
        visibleWhen: (values) => values.entryType !== "TRANSFER",
      },
      {
        name: "fromHouseholdId",
        label: "Origem",
        type: "select",
        options: householdOptions,
        visibleWhen: (values) => values.entryType === "TRANSFER",
      },
      {
        name: "toHouseholdId",
        label: "Destino",
        type: "select",
        options: householdOptions,
        visibleWhen: (values) => values.entryType === "TRANSFER",
      },
      {
        name: "includeInHouseholdBudget",
        label: "Considerar no calculo familiar",
        type: "boolean",
      },
      {
        name: "startDate",
        label: "Inicio",
        type: "date",
        visibleWhen: (values) => values.entryType === "BENEFIT",
      },
      {
        name: "endDate",
        label: "Fim",
        type: "date",
        visibleWhen: (values) => values.entryType === "BENEFIT",
      },
      {
        name: "notes",
        label: "Notas",
        type: "textarea",
        rows: 4,
      },
    ];
  }, [householdOptions]);

  return (
    <RecordForm<FinancialEntryFormValues>
      appearance="inline-detail"
      initialValues={initialValues}
      fields={fields}
      onValuesChange={onValuesChange}
      onFieldCommit={({ values }) => onFieldCommit?.(values)}
      onSubmit={onSubmit}
    />
  );
}
