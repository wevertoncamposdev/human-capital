export type Activity = {
  id: string;
  title: string;
  date: string;
  status: "Agendada" | "Concluida" | "Cancelada";
  notesHtml: string;
};

export type ActivityFormData = Omit<Activity, "id">;
