"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type { DepositAuditLogListResponse } from "./types";

export async function listDepositItemAuditLogs(
  token: string,
  itemId: string,
  params?: { page?: number; limit?: number },
) {
  const query = buildQuery(params);
  return apiRequest<DepositAuditLogListResponse>(
    `/Deposit/items/${itemId}/audit${query}`,
    {},
    token,
  );
}

export async function listDepositDonorAuditLogs(
  token: string,
  donorId: string,
  params?: { page?: number; limit?: number },
) {
  const query = buildQuery(params);
  return apiRequest<DepositAuditLogListResponse>(
    `/Deposit/donors/${donorId}/audit${query}`,
    {},
    token,
  );
}

export async function listDepositEntryAuditLogs(
  token: string,
  entryId: string,
  params?: { page?: number; limit?: number },
) {
  const query = buildQuery(params);
  return apiRequest<DepositAuditLogListResponse>(
    `/Deposit/entries/${entryId}/audit${query}`,
    {},
    token,
  );
}

export async function listDepositExitAuditLogs(
  token: string,
  exitId: string,
  params?: { page?: number; limit?: number },
) {
  const query = buildQuery(params);
  return apiRequest<DepositAuditLogListResponse>(
    `/Deposit/exits/${exitId}/audit${query}`,
    {},
    token,
  );
}
