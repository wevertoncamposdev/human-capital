import type { FormField, FormStep } from "@/web-client/forms/types";

export type OccurrenceFormValues = {
  title: string;
  type: "Convivencia" | "Seguranca" | "Saude" | "Educacional" | "Outro";
  status: "Inicial" | "Em andamento" | "Finalizada";
  date: string;
  summary: string;
  initialReportHtml: string;
  actionItemsText: string;
  progressNotesHtml: string;
  resolutionHtml: string;
};

export const occurrenceFormFields: FormField<OccurrenceFormValues>[] = [
  { name: "title", label: "Titulo", type: "text" },
  {
    name: "type",
    label: "Tipo de ocorrencia",
    type: "select",
    options: [
      { label: "Convivencia", value: "Convivencia" },
      { label: "Seguranca", value: "Seguranca" },
      { label: "Saude", value: "Saude" },
      { label: "Educacional", value: "Educacional" },
      { label: "Outro", value: "Outro" },
    ],
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Inicial", value: "Inicial" },
      { label: "Em andamento", value: "Em andamento" },
      { label: "Finalizada", value: "Finalizada" },
    ],
  },
  { name: "date", label: "Data", type: "date" },
  { name: "summary", label: "Resumo", type: "textarea" },
  {
    name: "initialReportHtml",
    label: "Etapa inicial (relato e acoes a tomar)",
    type: "richtext",
  },
  {
    name: "actionItemsText",
    label: "Etapa em andamento (acoes realizadas)",
    type: "textarea",
  },
  {
    name: "progressNotesHtml",
    label: "Evolucao em andamento",
    type: "richtext",
  },
  {
    name: "resolutionHtml",
    label: "Finalizacao (desfecho e evolucao)",
    type: "richtext",
  },
];

export const occurrenceFormSteps: FormStep[] = [
  {
    title: "Ocorrencia",
    fields: [
      "title",
      "type",
      "status",
      "date",
      "summary",
      "initialReportHtml",
      "actionItemsText",
      "progressNotesHtml",
      "resolutionHtml",
    ],
  },
];
