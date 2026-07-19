import type { FormField, FormStep } from "@/web-client/forms/types";
import type { ActivityFormData } from "@/features/activities/domain/types";

export const activityFormFields: FormField<ActivityFormData>[] = [
  { name: "title", label: "Titulo", type: "text" },
  { name: "date", label: "Data", type: "date" },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Agendada", value: "Agendada" },
      { label: "Concluida", value: "Concluida" },
      { label: "Cancelada", value: "Cancelada" },
    ],
  },
  { name: "notesHtml", label: "Detalhes", type: "richtext" },
];

export const activityFormSteps: FormStep[] = [
  {
    title: "Atividade",
    fields: ["title", "date", "status", "notesHtml"],
  },
];
