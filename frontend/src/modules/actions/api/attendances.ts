"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type {
  AttendanceStatus,
  ProjectActionAttendancesListResponse,
} from "./types";

export async function listProjectActionAttendances(
  token: string,
  projectId: string,
  actionId: string,
  params?: {
    q?: string;
    status?: AttendanceStatus;
    groupId?: string;
    page?: number;
    limit?: number;
  },
) {
  const query = buildQuery(params);
  return apiRequest<ProjectActionAttendancesListResponse>(
    `/projects/${projectId}/actions/${actionId}/attendances${query}`,
    {},
    token,
  );
}

export async function upsertProjectActionAttendances(
  token: string,
  projectId: string,
  actionId: string,
  items: {
    enrollmentId: string;
    status: AttendanceStatus;
    notes?: string | null;
    qualityScore?: number | null;
    qualityNotes?: string | null;
    isHighlight?: boolean;
  }[],
) {
  return apiRequest<{ ok: true; created: number; updated: number }>(
    `/projects/${projectId}/actions/${actionId}/attendances`,
    { method: "PUT", body: JSON.stringify({ items }) },
    token,
  );
}
