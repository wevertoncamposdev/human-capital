import type { FormField, FormStep } from "@/web-client/forms/types";
import type { AttendanceFormData } from "@/features/attendances/domain/types";

export const attendanceFormFields: FormField<AttendanceFormData>[] = [
  { name: "title", label: "Titulo", type: "text" },
  { name: "summary", label: "Resumo", type: "textarea" },
  { name: "date", label: "Data", type: "date" },
  {
    name: "type",
    label: "Tipo de atendimento",
    type: "select",
    options: [
      { label: "Social", value: "Social" },
      { label: "Psicologico", value: "Psicologico" },
      { label: "Familiar", value: "Familiar" },
      { label: "Outro", value: "Outro" },
    ],
  },
  { name: "staffName", label: "Funcionario", type: "text" },
  { name: "notesHtml", label: "Detalhes", type: "richtext" },
];

export const attendanceFormSteps: FormStep[] = [
  {
    title: "Atendimento",
    fields: ["title", "summary", "date", "type", "staffName", "notesHtml"],
  },
];
