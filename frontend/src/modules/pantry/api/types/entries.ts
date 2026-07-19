import type { PantryPagination } from "./shared";

export type ApiPantryEntry = {
  id: string;
  itemId: string;
  donorId: string | null;
  sector: string;
  createdBy?: string;
  quantity: number;
  unit: string;
  entryDate: string;
  expiryDate: string | null;
  notes: string | null;
  tags: string[];
  internalNotes: string | null;
  allocatedTotal?: number;
  remaining?: number;
  isClosed?: boolean;
  createdAt: string;
  updatedAt: string;
  item: { id: string; name: string; unit: string };
  donor:
    | { id: string; name: string; type: "PERSON" | "COMPANY"; contact: string | null }
    | null;
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

export type PantryEntriesListResponse = {
  data: ApiPantryEntry[];
  pagination: PantryPagination;
};

export type PantryEntryInput = {
  itemId: string;
  donorId?: string | null;
  sector: string;
  quantity: number;
  unit: string;
  entryDate?: string;
  expiryDate?: string | null;
  notes?: string | null;
  tags?: string[];
  internalNotes?: string | null;
};
