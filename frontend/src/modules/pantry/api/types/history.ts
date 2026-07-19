import type { PantryPagination } from "./shared";

export type ApiPantryHistoryMovement = {
  id: string;
  kind: "ENTRY" | "EXIT";
  movementDate: string;
  createdAt: string;
  itemId: string;
  item: {
    id: string;
    name: string;
    unit: string;
    group: string | null;
  };
  sector: string;
  quantity: number;
  unit: string;
  notes: string | null;
  expiryDate: string | null;
  donorName: string | null;
  type: string | null;
  eventName: string | null;
  actor: string;
};

export type PantryHistoryListResponse = {
  data: ApiPantryHistoryMovement[];
  pagination: PantryPagination;
};

