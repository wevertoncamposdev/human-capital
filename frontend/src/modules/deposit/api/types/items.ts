import type { DepositPagination, DepositValidityStatus } from "./shared";

export type ApiDepositItem = {
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
  validityStatus: DepositValidityStatus;
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

export type DepositItemsListResponse = {
  data: ApiDepositItem[];
  pagination: DepositPagination;
};

export type DepositItemInput = {
  name: string;
  group?: string | null;
  defaultSector?: string;
  unit: string;
  minStock: number;
  notes?: string | null;
  tags?: string[];
  internalNotes?: string | null;
};

export type ApiDepositSectorBalance = {
  sector: string;
  stock: number;
  entriesTotal: number;
  exitsTotal: number;
  nextExpiryDate: string | null;
  nextExpiryEntryId?: string | null;
  validityStatus: DepositValidityStatus;
  daysToExpire: number | null;
};

export type DepositItemSectorsResponse = {
  itemId: string;
  sectors: ApiDepositSectorBalance[];
};

export type DepositItemSuggestionsResponse = {
  units: string[];
  groups: string[];
};
