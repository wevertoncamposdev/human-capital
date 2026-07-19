import type { PantryPagination } from "./shared";

export type ApiPantryDonor = {
  id: string;
  name: string;
  type: "PERSON" | "COMPANY";
  contact: string | null;
  avatarUrl: string | null;
  tags: string[];
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  comments: Array<{
    id: string;
    body: string;
    mentionUserIds: string[];
    createdAt: string;
    updatedAt: string;
    author: {
      id: string | null;
      name: string;
      email?: string | null;
      avatarUrl?: string | null;
    };
  }>;
  attachments: Array<{
    id: string;
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    sizeLabel?: string | null;
    createdAt: string;
  }>;
};

export type PantryDonorsListResponse = {
  data: ApiPantryDonor[];
  pagination: PantryPagination;
};

export type PantryDonorInput = {
  name: string;
  type?: "PERSON" | "COMPANY";
  contact?: string | null;
  avatarUrl?: string | null;
  tags?: string[];
  internalNotes?: string | null;
};
