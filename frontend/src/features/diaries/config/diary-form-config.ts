import type { FormField, FormStep } from "@/web-client/forms/types";
import type { DiaryEntryFormData } from "@/features/diaries/domain/types";

export const diaryFormFields: FormField<DiaryEntryFormData>[] = [
  { name: "title", label: "Titulo", type: "text" },
  { name: "summary", label: "Resumo", type: "textarea" },
  { name: "date", label: "Data", type: "date" },
  { name: "notesHtml", label: "Detalhes", type: "richtext" },
];

export const diaryFormSteps: FormStep[] = [
  {
    title: "Diario",
    fields: ["title", "summary", "date", "notesHtml"],
  },
];
