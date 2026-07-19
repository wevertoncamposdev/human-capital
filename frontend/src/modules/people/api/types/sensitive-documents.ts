export type ApiPersonSensitiveDocuments = {
  cpf: string | null;
  rg: string | null;
  nis: string | null;
  cns: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonSensitiveDocumentsInput = {
  cpf?: string;
  rg?: string;
  nis?: string;
  cns?: string;
};

