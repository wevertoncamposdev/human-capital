"use client";

import type { ApiPantryExit } from "@/modules/pantry/api";

export type PantryItemDetailMode = "create" | "edit";

export type ItemDraft = {
  name: string;
  group: string | null;
  defaultSector: string;
  unit: string;
  minStock: number;
  notes: string | null;
};

export type EntryDraft = {
  donorId: string | null;
  quantity: number;
  unit: string;
  sector: string;
  entryDate: string;
  expiryDate: string;
  notes: string;
};

export type ExitDraft = {
  entryId: string;
  quantity: number;
  unit: string;
  sector: string;
  exitDate: string;
  type: ApiPantryExit["type"];
  eventName: string;
  notes: string;
};

