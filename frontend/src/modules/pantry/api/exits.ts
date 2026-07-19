import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiPantryEntry,
  ApiPantryExit,
  PantryExitInput,
  PantryExitsListResponse,
} from "./types";

export async function reversePantryExit(
  token: string,
  exitId: string,
  payload?: { date?: string; notes?: string },
) {
  return apiRequest<{ ok: true; exitId: string; createdEntries: ApiPantryEntry[] }>(
    `/pantry/exits/${exitId}/reverse`,
    { method: "POST", body: JSON.stringify(payload ?? {}) },
    token,
  );
}

export async function listPantryExits(
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
  return apiRequest<PantryExitsListResponse>(`/pantry/exits${query}`, {}, token);
}

export async function getPantryExit(token: string, id: string) {
  return apiRequest<ApiPantryExit>(`/pantry/exits/${id}`, {}, token);
}

export async function createPantryExit(token: string, payload: PantryExitInput) {
  return apiRequest<ApiPantryExit>(
    "/pantry/exits",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updatePantryExit(
  token: string,
  id: string,
  payload: Partial<PantryExitInput>,
) {
  return apiRequest<ApiPantryExit>(
    `/pantry/exits/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryExit(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/pantry/exits/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addPantryExitComment(
  token: string,
  id: string,
  payload: { body: string; mentionUserIds?: string[] },
) {
  return apiRequest<ApiPantryExit>(
    `/pantry/exits/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryExitComment(token: string, id: string, commentId: string) {
  return apiRequest<ApiPantryExit>(
    `/pantry/exits/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addPantryExitAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiPantryExit>(
    `/pantry/exits/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryExitAttachment(token: string, id: string, attachmentId: string) {
  return apiRequest<ApiPantryExit>(
    `/pantry/exits/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
