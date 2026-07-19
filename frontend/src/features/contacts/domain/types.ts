export type Contact = {
  id: string;
  name: string;
  relationship: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
};

export type ContactFormData = Omit<Contact, "id">;
