import type { DepositPagination } from "./shared";

export type ApiDepositDonor = {
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

export type DepositDonorsListResponse = {
  data: ApiDepositDonor[];
  pagination: DepositPagination;
};

export type DepositDonorInput = {
  name: string;
  type?: "PERSON" | "COMPANY";
  contact?: string | null;
  avatarUrl?: string | null;
  tags?: string[];
  internalNotes?: string | null;
};
