export type OccurrenceType =
  | "Convivencia"
  | "Seguranca"
  | "Saude"
  | "Educacional"
  | "Outro";

export type OccurrenceStatus = "Inicial" | "Em andamento" | "Finalizada";

export type Occurrence = {
  id: string;
  title: string;
  type: OccurrenceType;
  status: OccurrenceStatus;
  date: string;
  summary: string;
  initialReportHtml: string;
  actionItems: string[];
  progressNotesHtml: string;
  resolutionHtml: string;
};

export type OccurrenceFormData = Omit<Occurrence, "id">;
