export type ApiHealthCondition = {
  id: string;
  personId: string;
  type: string;
  description?: string | null;
  severity?: string | null;
  diagnosisDate?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

