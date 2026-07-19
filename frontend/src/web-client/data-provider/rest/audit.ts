"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type { DetailAuditLogListResponse } from "@/web-client/detail/audit-types";

export async function listAuditLogs(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    entityId?: string;
    userId?: string;
    from?: string;
    to?: string;
    search?: string;
  },
) {
  const query = buildQuery(params);
  return apiRequest<DetailAuditLogListResponse>(`/audit-logs${query}`, {}, token);
}
