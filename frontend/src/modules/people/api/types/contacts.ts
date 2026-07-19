export type ApiPersonContactType = "EMAIL" | "PHONE";
export type ApiPersonContactRole = "SELF" | "RESPONSIBLE" | "EMERGENCY";

export type ApiPersonContact = {
  id: string;
  personId: string;
  role: ApiPersonContactRole;
  type: ApiPersonContactType;
  label: string | null;
  name: string | null;
  relationship: string | null;
  value: string;
  isPrimary: boolean;
  isWhatsapp: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonContactInput = {
  type: ApiPersonContactType;
  value: string;
  role?: ApiPersonContactRole;
  label?: string | null;
  name?: string | null;
  relationship?: string | null;
  isPrimary?: boolean;
  isWhatsapp?: boolean;
  notes?: string | null;
};

