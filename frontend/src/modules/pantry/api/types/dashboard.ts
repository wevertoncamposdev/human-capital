import type { PantryValidityStatus } from "./shared";

export type PantryDashboardResponse = {
  totals: { items: number; stock: number; lowStock: number };
  stockRows: Array<{
    itemId: string;
    name: string;
    group: string | null;
    tags: string[];
    unit: string;
    sector: string;
    sectorStock: number;
    itemStock: number;
    minStock: number;
    isBelowMin: boolean;
    nextExpiryDate: string | null;
    validityStatus: PantryValidityStatus;
    daysToExpire: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
  recentEntries: Array<{
    id: string;
    itemId: string;
    item: { id: string; name: string; unit: string; group: string | null };
    donor: { id: string; name: string } | null;
    sector: string;
    quantity: number;
    unit: string;
    entryDate: string;
    createdAt: string;
    expiryDate: string | null;
    notes: string | null;
    createdBy: string;
  }>;
  recentExits: Array<{
    id: string;
    itemId: string;
    item: { id: string; name: string; unit: string; group: string | null };
    sector: string;
    quantity: number;
    unit: string;
    exitDate: string;
    createdAt: string;
    type: string;
    eventName: string | null;
    notes: string | null;
    removedBy: string;
  }>;
  expiring: Array<{
    itemId: string;
    name: string;
    unit: string;
    group: string | null;
    sector: string;
    stock: number;
    nextExpiryDate: string | null;
    validityStatus: PantryValidityStatus;
    daysToExpire: number | null;
  }>;
};
