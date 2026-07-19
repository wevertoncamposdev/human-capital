import type { FormField, FormStep } from "@/web-client/forms/types";
import type { AssessmentFormData } from "@/features/assessments/domain/types";

export const assessmentFormFields: FormField<AssessmentFormData>[] = [
  { name: "title", label: "Titulo", type: "text" },
  { name: "date", label: "Data", type: "date" },
  { name: "summary", label: "Resumo", type: "textarea" },
  { name: "notesHtml", label: "Detalhes", type: "richtext" },
];

export const assessmentFormSteps: FormStep[] = [
  {
    title: "Avaliacao",
    fields: ["title", "date", "summary", "notesHtml"],
  },
];
