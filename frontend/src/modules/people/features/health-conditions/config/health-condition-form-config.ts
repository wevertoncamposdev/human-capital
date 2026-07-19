import type { FormField, FormStep } from "@/web-client/forms/types";

export type HealthConditionFormValues = {
  type: string;
  description?: string;
  severity?: string;
  diagnosisDate?: string;
  documentFile?: File | null;
  removeDocument?: boolean;
  notes?: string;
};

export const healthConditionTypeOptions = [
  { label: "Deficiencia Auditiva", value: "Deficiencia Auditiva" },
  { label: "Deficiencia Visual", value: "Deficiencia Visual" },
  { label: "Deficiencia Motora", value: "Deficiencia Motora" },
  { label: "Deficiencia Intelectual", value: "Deficiencia Intelectual" },
  { label: "Condicao Cronica", value: "Condicao Cronica" },
  { label: "Alergia", value: "Alergia" },
  { label: "Transtorno", value: "Transtorno" },
  { label: "Necessidade Especifica", value: "Necessidade Especifica" },
  { label: "Outro", value: "Outro" },
];

export const healthConditionSeverityOptions = [
  { label: "Leve", value: "Leve" },
  { label: "Moderada", value: "Moderada" },
  { label: "Severa", value: "Severa" },
  { label: "Nao informado", value: "Nao informado" },
];

export const healthConditionFormFields: FormField<HealthConditionFormValues>[] = [
  {
    name: "type",
    label: "Tipo de condicao",
    type: "select",
    options: healthConditionTypeOptions,
    required: true,
  },
  {
    name: "description",
    label: "Descricao",
    type: "textarea",
    rows: 3,
  },
  {
    name: "severity",
    label: "Severidade",
    type: "select",
    options: healthConditionSeverityOptions,
  },
  { name: "diagnosisDate", label: "Data do diagnostico", type: "date" },
  {
    name: "documentFile",
    label: "Upload do documento",
    type: "file",
    accept: ".pdf,image/*",
    helperText: "PDF ou imagem. Opcional.",
  },
  {
    name: "notes",
    label: "Observacoes",
    type: "textarea",
    rows: 3,
  },
];

export const healthConditionFormSteps: FormStep[] = [
  {
    title: "Condicao de saude",
    fields: [
      "type",
      "description",
      "severity",
      "diagnosisDate",
      "documentFile",
      "notes",
    ],
  },
];
