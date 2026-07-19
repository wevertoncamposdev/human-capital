export type SchoolHistory = {
  id: string;
  year: number;
  school: string;
  grade: string;
  shift: string;
  isCurrent?: boolean;
};

export type SchoolHistoryFormData = Omit<SchoolHistory, "id">;
