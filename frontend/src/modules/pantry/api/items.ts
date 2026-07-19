import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiPantryItem,
  PantryItemInput,
  PantryItemSectorsResponse,
  PantryItemSuggestionsResponse,
  PantryItemsListResponse,
} from "./types";

export async function getPantryItem(token: string, id: string) {
  return apiRequest<ApiPantryItem>(`/pantry/items/${id}`, {}, token);
}

export async function getPantryItemSectors(token: string, itemId: string) {
  return apiRequest<PantryItemSectorsResponse>(
    `/pantry/items/${itemId}/sectors`,
    {},
    token,
  );
}

export async function listPantryItems(
  token: string,
  params?: { q?: string; page?: number; limit?: number; all?: boolean },
) {
  const query = buildQuery(params);
  return apiRequest<PantryItemsListResponse>(`/pantry/items${query}`, {}, token);
}

export async function listPantryItemSuggestions(token: string) {
  return apiRequest<PantryItemSuggestionsResponse>(
    "/pantry/items/suggestions",
    {},
    token,
  );
}

export async function createPantryItem(token: string, payload: PantryItemInput) {
  return apiRequest<ApiPantryItem>(
    "/pantry/items",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updatePantryItem(
  token: string,
  id: string,
  payload: Partial<PantryItemInput>,
) {
  return apiRequest<ApiPantryItem>(
    `/pantry/items/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryItem(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/pantry/items/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addPantryItemComment(
  token: string,
  id: string,
  payload: { body: string; mentionUserIds?: string[] },
) {
  return apiRequest<ApiPantryItem>(
    `/pantry/items/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryItemComment(token: string, id: string, commentId: string) {
  return apiRequest<ApiPantryItem>(
    `/pantry/items/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addPantryItemAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiPantryItem>(
    `/pantry/items/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryItemAttachment(token: string, id: string, attachmentId: string) {
  return apiRequest<ApiPantryItem>(
    `/pantry/items/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
