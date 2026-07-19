import { apiRequest, buildQuery } from "@/lib/api";
import type { DepositHistoryListResponse } from "./types";

export async function listDepositHistory(
  token: string,
  params?: {
    q?: string;
    search?: string;
    kind?: "ALL" | "ENTRY" | "EXIT";
    itemId?: string;
    type?: "LOAN" | "FINAL_REMOVAL" | "TRANSFER" | "ADJUSTMENT" | "LOSS";
    destinationName?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    all?: boolean;
  },
) {
  const query = buildQuery(params);
  return apiRequest<DepositHistoryListResponse>(`/deposit/history${query}`, {}, token);
}
