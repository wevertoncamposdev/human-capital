import type { FormField, FormStep } from "@/web-client/forms/types";
import type { IncomeProfileFormData } from "@/features/incomes/domain/types";

export const incomeFormFields: FormField<IncomeProfileFormData>[] = [
  { name: "income", label: "Renda principal", type: "money" },
  {
    name: "incomeRange",
    label: "Faixa de renda",
    type: "currency_range",
    minPlaceholder: "Min",
    maxPlaceholder: "Max",
  },
  { name: "otherIncome", label: "Outras rendas", type: "money" },
  {
    name: "benefits",
    label: "Beneficios",
    type: "multiselect",
    options: [
      { label: "Bolsa Familia", value: "Bolsa Familia" },
      { label: "Auxilio Gas", value: "Auxilio Gas" },
      { label: "Tarifa Social", value: "Tarifa Social" },
      { label: "Vale Transporte", value: "Vale Transporte" },
    ],
  },
  {
    name: "employmentStatus",
    label: "Situacao profissional",
    type: "select",
    options: [
      { label: "CLT", value: "CLT" },
      { label: "Autonomo", value: "Autonomo" },
      { label: "Desempregado", value: "Desempregado" },
      { label: "Aposentado", value: "Aposentado" },
    ],
  },
  {
    name: "employmentPeriod",
    label: "Periodo de trabalho",
    type: "date_range",
    startPlaceholder: "Inicio",
    endPlaceholder: "Fim",
  },
];

export const incomeFormSteps: FormStep[] = [
  {
    title: "Renda",
    fields: [
      "income",
      "incomeRange",
      "otherIncome",
      "benefits",
      "employmentStatus",
      "employmentPeriod",
    ],
  },
];
