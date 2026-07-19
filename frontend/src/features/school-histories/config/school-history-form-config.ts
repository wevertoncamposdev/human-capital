import type { FormField, FormStep } from "@/web-client/forms/types";
import type { SchoolHistoryFormData } from "@/features/school-histories/domain/types";

export const schoolHistoryFormFields: FormField<SchoolHistoryFormData>[] = [
  { name: "year", label: "Ano", type: "number" },
  { name: "school", label: "Escola", type: "text" },
  { name: "grade", label: "Serie", type: "text" },
  { name: "shift", label: "Turno", type: "text" },
  { name: "isCurrent", label: "Atual", type: "boolean" },
];

export const schoolHistoryFormSteps: FormStep[] = [
  {
    title: "Escolar",
    fields: ["year", "school", "grade", "shift", "isCurrent"],
  },
];
