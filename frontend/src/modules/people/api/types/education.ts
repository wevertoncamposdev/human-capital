export type ApiPersonEducation = {
  id: string;
  personId: string;
  level: string;
  status?: string | null;
  institution?: string | null;
  grade?: string | null;
  schoolYear?: string | null;
  isCurrent: boolean;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

