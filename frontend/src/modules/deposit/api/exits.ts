import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiDepositEntry,
  ApiDepositExit,
  DepositExitInput,
  DepositExitsListResponse,
} from "./types";

export async function reverseDepositExit(
  token: string,
  exitId: string,
  payload?: { date?: string; notes?: string },
) {
  return apiRequest<{ ok: true; exitId: string; createdEntries: ApiDepositEntry[] }>(
    `/Deposit/exits/${exitId}/reverse`,
    { method: "POST", body: JSON.stringify(payload ?? {}) },
    token,
  );
}

export async function listDepositExits(
  token: string,
  params?: {
    q?: string;
    search?: string;
    page?: number;
    limit?: number;
    all?: boolean;
    itemId?: string;
    type?: string;
    from?: string;
    to?: string;
  },
) {
  const query = buildQuery(params);
  return apiRequest<DepositExitsListResponse>(`/Deposit/exits${query}`, {}, token);
}

export async function getDepositExit(token: string, id: string) {
  return apiRequest<ApiDepositExit>(`/Deposit/exits/${id}`, {}, token);
}

export async function createDepositExit(token: string, payload: DepositExitInput) {
  return apiRequest<ApiDepositExit>(
    "/Deposit/exits",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateDepositExit(
  token: string,
  id: string,
  payload: Partial<DepositExitInput>,
) {
  return apiRequest<ApiDepositExit>(
    `/Deposit/exits/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositExit(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/Deposit/exits/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addDepositExitComment(
  token: string,
  id: string,
  payload: { body: string; mentionUserIds?: string[] },
) {
  return apiRequest<ApiDepositExit>(
    `/Deposit/exits/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositExitComment(token: string, id: string, commentId: string) {
  return apiRequest<ApiDepositExit>(
    `/Deposit/exits/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addDepositExitAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiDepositExit>(
    `/Deposit/exits/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositExitAttachment(token: string, id: string, attachmentId: string) {
  return apiRequest<ApiDepositExit>(
    `/Deposit/exits/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
