export type AttendanceType = "Social" | "Psicologico" | "Familiar" | "Outro";

export type Attendance = {
  id: string;
  title: string;
  summary: string;
  date: string;
  notesHtml: string;
  type: AttendanceType;
  staffName: string;
};

export type AttendanceFormData = Omit<Attendance, "id">;
