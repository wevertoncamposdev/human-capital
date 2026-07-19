import { apiRequest, buildQuery } from "@/lib/api";
import type { PantryHistoryListResponse } from "./types";

export async function listPantryHistory(
  token: string,
  params?: {
    q?: string;
    search?: string;
    kind?: "ALL" | "ENTRY" | "EXIT";
    itemId?: string;
    type?: "ATTENDED" | "DONATION" | "EVENT" | "PARTY" | "CORRECTION";
    eventName?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    all?: boolean;
  },
) {
  const query = buildQuery(params);
  return apiRequest<PantryHistoryListResponse>(`/pantry/history${query}`, {}, token);
}

