import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiDepositExit,
  ApiDepositEntry,
  DepositEntryInput,
  DepositEntriesListResponse,
} from "./types";

export async function reverseDepositEntry(
  token: string,
  entryId: string,
  payload?: { date?: string; notes?: string },
) {
  return apiRequest<ApiDepositExit>(
    `/Deposit/entries/${entryId}/reverse`,
    { method: "POST", body: JSON.stringify(payload ?? {}) },
    token,
  );
}

export async function listDepositEntries(
  token: string,
  params?: {
    q?: string;
    search?: string;
    page?: number;
    limit?: number;
    all?: boolean;
    itemId?: string;
    donorId?: string;
    from?: string;
    to?: string;
  },
) {
  const query = buildQuery(params);
  return apiRequest<DepositEntriesListResponse>(`/Deposit/entries${query}`, {}, token);
}

export async function getDepositEntry(token: string, id: string) {
  return apiRequest<ApiDepositEntry>(`/Deposit/entries/${id}`, {}, token);
}

export async function createDepositEntry(token: string, payload: DepositEntryInput) {
  return apiRequest<ApiDepositEntry>(
    "/Deposit/entries",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateDepositEntry(
  token: string,
  id: string,
  payload: Partial<DepositEntryInput>,
) {
  return apiRequest<ApiDepositEntry>(
    `/Deposit/entries/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositEntry(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/Deposit/entries/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addDepositEntryComment(
  token: string,
  id: string,
  payload: { body: string; mentionUserIds?: string[] },
) {
  return apiRequest<ApiDepositEntry>(
    `/Deposit/entries/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositEntryComment(token: string, id: string, commentId: string) {
  return apiRequest<ApiDepositEntry>(
    `/Deposit/entries/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addDepositEntryAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiDepositEntry>(
    `/Deposit/entries/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositEntryAttachment(token: string, id: string, attachmentId: string) {
  return apiRequest<ApiDepositEntry>(
    `/Deposit/entries/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
