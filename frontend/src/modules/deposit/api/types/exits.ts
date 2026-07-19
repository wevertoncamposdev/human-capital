import type { DepositPagination } from "./shared";

export type DepositExitType =
  | "LOAN"
  | "FINAL_REMOVAL"
  | "TRANSFER"
  | "ADJUSTMENT"
  | "LOSS";

export type ApiDepositExit = {
  id: string;
  itemId: string;
  entryIds?: string[];
  allocations?: Array<{
    entryId: string;
    quantity: number;
    expiryDate: string | null;
    sector: string;
  }>;
  sector: string;
  removedBy?: string;
  quantity: number;
  unit: string;
  exitDate: string;
  type: DepositExitType;
  destinationName: string | null;
  destinationType: string | null;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  returnedQuantity: number | null;
  returnNotes: string | null;
  notes: string | null;
  tags: string[];
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  item: { id: string; name: string; unit: string };
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

export type DepositExitsListResponse = {
  data: ApiDepositExit[];
  pagination: DepositPagination;
};

export type DepositExitInput = {
  itemId: string;
  entryId?: string;
  sector: string;
  quantity: number;
  unit: string;
  exitDate?: string;
  type?: DepositExitType;
  destinationName?: string | null;
  destinationType?: string | null;
  expectedReturnAt?: string | null;
  returnedAt?: string | null;
  returnedQuantity?: number | null;
  returnNotes?: string | null;
  notes?: string | null;
  tags?: string[];
  internalNotes?: string | null;
};
