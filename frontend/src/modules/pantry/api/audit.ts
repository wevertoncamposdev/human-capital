"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type { PantryAuditLogListResponse } from "./types";

export async function listPantryItemAuditLogs(
  token: string,
  itemId: string,
  params?: { page?: number; limit?: number },
) {
  const query = buildQuery(params);
  return apiRequest<PantryAuditLogListResponse>(
    `/pantry/items/${itemId}/audit${query}`,
    {},
    token,
  );
}

export async function listPantryDonorAuditLogs(
  token: string,
  donorId: string,
  params?: { page?: number; limit?: number },
) {
  const query = buildQuery(params);
  return apiRequest<PantryAuditLogListResponse>(
    `/pantry/donors/${donorId}/audit${query}`,
    {},
    token,
  );
}

export async function listPantryEntryAuditLogs(
  token: string,
  entryId: string,
  params?: { page?: number; limit?: number },
) {
  const query = buildQuery(params);
  return apiRequest<PantryAuditLogListResponse>(
    `/pantry/entries/${entryId}/audit${query}`,
    {},
    token,
  );
}

export async function listPantryExitAuditLogs(
  token: string,
  exitId: string,
  params?: { page?: number; limit?: number },
) {
  const query = buildQuery(params);
  return apiRequest<PantryAuditLogListResponse>(
    `/pantry/exits/${exitId}/audit${query}`,
    {},
    token,
  );
}
