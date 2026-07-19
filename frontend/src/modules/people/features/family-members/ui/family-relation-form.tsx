"use client";

import * as React from "react";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import type { PersonSummary } from "@/modules/people/shared/domain/types";

export type FamilyRelationFormValues = {
  relatedPersonId: string;
  type: string;
  livesTogether: boolean;
  isLegalGuardian: boolean;
  isHouseholdHead: boolean;
  householdRole: string;
  isIncomeContributor: boolean;
  isProvider: boolean;
  isDependent: boolean;
  notes: string;
};

type FamilyRelationFormProps = {
  initialValues: FamilyRelationFormValues;
  peopleOptions: PersonSummary[];
  disableRelatedPerson?: boolean;
  onSubmit: (values: FamilyRelationFormValues) => void | Promise<void>;
  onValuesChange?: (values: FamilyRelationFormValues) => void;
  onFieldCommit?: (values: FamilyRelationFormValues) => void;
};

const RELATION_TYPE_OPTIONS = [
  "Pai",
  "Mae",
  "Filho(a)",
  "Irmao(a)",
  "Conjuge",
  "Responsavel",
  "Dependente",
  "Avo(a)",
  "Tio(a)",
  "Primo(a)",
  "Outro",
].map((value) => ({ label: value, value }));

const HOUSEHOLD_ROLE_OPTIONS = [
  "Morador",
  "Responsavel",
  "Dependente",
  "Provedor",
  "Outro",
].map((value) => ({ label: value, value }));

export function FamilyRelationForm({
  initialValues,
  peopleOptions,
  disableRelatedPerson = false,
  onSubmit,
  onValuesChange,
  onFieldCommit,
}: FamilyRelationFormProps) {
  const fields = React.useMemo<FormField<FamilyRelationFormValues>[]>(
    () => [
      {
        name: "relatedPersonId",
        label: "Pessoa relacionada",
        type: "select",
        required: true,
        options: peopleOptions.map((person) => ({
          value: person.id,
          label: person.fullName,
        })),
        disabled: disableRelatedPerson,
      },
      {
        name: "type",
        label: "Tipo de vinculo",
        type: "select",
        required: true,
        options: RELATION_TYPE_OPTIONS,
      },
      {
        name: "livesTogether",
        label: "Mora junto",
        type: "boolean",
      },
      {
        name: "householdRole",
        label: "Papel no domicilio",
        type: "select",
        options: HOUSEHOLD_ROLE_OPTIONS,
        visibleWhen: (values) => values.livesTogether,
      },
      {
        name: "isLegalGuardian",
        label: "Responsavel legal",
        type: "boolean",
      },
      {
        name: "isHouseholdHead",
        label: "Responsavel principal",
        type: "boolean",
        visibleWhen: (values) => values.livesTogether,
      },
      {
        name: "isIncomeContributor",
        label: "Contribui com renda",
        type: "boolean",
        visibleWhen: (values) => values.livesTogether,
      },
      {
        name: "isProvider",
        label: "Provedor",
        type: "boolean",
        visibleWhen: (values) => values.livesTogether,
      },
      {
        name: "isDependent",
        label: "Dependente",
        type: "boolean",
        visibleWhen: (values) => values.livesTogether,
      },
      {
        name: "notes",
        label: "Notas",
        type: "textarea",
        rows: 4,
        placeholder: "Observacoes sobre o vinculo",
      },
    ],
    [disableRelatedPerson, peopleOptions],
  );

  return (
    <RecordForm<FamilyRelationFormValues>
      appearance="inline-detail"
      initialValues={initialValues}
      fields={fields}
      onValuesChange={onValuesChange}
      onFieldCommit={({ values }) => onFieldCommit?.(values)}
      onSubmit={onSubmit}
    />
  );
}
