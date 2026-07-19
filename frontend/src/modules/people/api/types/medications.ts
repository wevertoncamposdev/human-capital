export type ApiMedication = {
  id: string;
  personId: string;
  reason?: string | null;
  medication: string;
  dosage?: string | null;
  schedule?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  prescribingDoctor?: string | null;
  permissionDocumentUrl?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

