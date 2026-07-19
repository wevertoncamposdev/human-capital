export type Assessment = {
  id: string;
  title: string;
  date: string;
  summary: string;
  notesHtml: string;
};

export type AssessmentFormData = Omit<Assessment, "id">;
