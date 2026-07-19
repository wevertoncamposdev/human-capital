export type DiaryEntry = {
  id: string;
  title: string;
  summary: string;
  date: string;
  notesHtml: string;
};

export type DiaryEntryFormData = Omit<DiaryEntry, "id">;
