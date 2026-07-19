import type { FormField, FormStep } from "@/web-client/forms/types";

export type FormationFormValues = {
  institution: string;
  course: string;
  level: string;
  status: string;
  periodStart: string;
  periodEnd: string;
};

export const formationFormFields: FormField<FormationFormValues>[] = [
  { name: "institution", label: "Instituicao", type: "text" },
  { name: "course", label: "Curso", type: "text" },
  { name: "level", label: "Nivel", type: "text" },
  { name: "status", label: "Status", type: "text" },
  { name: "periodStart", label: "Inicio", type: "date" },
  { name: "periodEnd", label: "Fim", type: "date" },
];

export const formationFormSteps: FormStep[] = [
  {
    title: "Formacao",
    fields: [
      "institution",
      "course",
      "level",
      "status",
      "periodStart",
      "periodEnd",
    ],
  },
];
