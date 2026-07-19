import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiPantryExit,
  ApiPantryEntry,
  PantryEntryInput,
  PantryEntriesListResponse,
} from "./types";

export async function reversePantryEntry(
  token: string,
  entryId: string,
  payload?: { date?: string; notes?: string },
) {
  return apiRequest<ApiPantryExit>(
    `/pantry/entries/${entryId}/reverse`,
    { method: "POST", body: JSON.stringify(payload ?? {}) },
    token,
  );
}

export async function listPantryEntries(
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
  return apiRequest<PantryEntriesListResponse>(`/pantry/entries${query}`, {}, token);
}

export async function getPantryEntry(token: string, id: string) {
  return apiRequest<ApiPantryEntry>(`/pantry/entries/${id}`, {}, token);
}

export async function createPantryEntry(token: string, payload: PantryEntryInput) {
  return apiRequest<ApiPantryEntry>(
    "/pantry/entries",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updatePantryEntry(
  token: string,
  id: string,
  payload: Partial<PantryEntryInput>,
) {
  return apiRequest<ApiPantryEntry>(
    `/pantry/entries/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryEntry(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/pantry/entries/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addPantryEntryComment(
  token: string,
  id: string,
  payload: { body: string; mentionUserIds?: string[] },
) {
  return apiRequest<ApiPantryEntry>(
    `/pantry/entries/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryEntryComment(token: string, id: string, commentId: string) {
  return apiRequest<ApiPantryEntry>(
    `/pantry/entries/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addPantryEntryAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiPantryEntry>(
    `/pantry/entries/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryEntryAttachment(token: string, id: string, attachmentId: string) {
  return apiRequest<ApiPantryEntry>(
    `/pantry/entries/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
