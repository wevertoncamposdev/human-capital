import type { PantryPagination, PantryValidityStatus } from "./shared";

export type ApiPantryItem = {
  id: string;
  tenantId: string;
  name: string;
  group: string | null;
  defaultSector: string;
  unit: string;
  minStock: number;
  notes: string | null;
  tags: string[];
  internalNotes: string | null;
  stock: number;
  entriesTotal: number;
  exitsTotal: number;
  lastEntryDate: string | null;
  lastExitDate: string | null;
  lastMovementDate: string | null;
  nextExpiryDate: string | null;
  validityStatus: PantryValidityStatus;
  daysToExpire: number | null;
  isBelowMin: boolean;
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

export type PantryItemsListResponse = {
  data: ApiPantryItem[];
  pagination: PantryPagination;
};

export type PantryItemInput = {
  name: string;
  group?: string | null;
  defaultSector?: string;
  unit: string;
  minStock: number;
  notes?: string | null;
  tags?: string[];
  internalNotes?: string | null;
};

export type ApiPantrySectorBalance = {
  sector: string;
  stock: number;
  entriesTotal: number;
  exitsTotal: number;
  nextExpiryDate: string | null;
  nextExpiryEntryId?: string | null;
  validityStatus: PantryValidityStatus;
  daysToExpire: number | null;
};

export type PantryItemSectorsResponse = {
  itemId: string;
  sectors: ApiPantrySectorBalance[];
};

export type PantryItemSuggestionsResponse = {
  units: string[];
  groups: string[];
};
