export type ApiPersonDetention = {
  id: string;
  personId: string;
  status: string;
  type?: string | null;
  unit?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

