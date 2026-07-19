import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiDepositItem,
  DepositItemInput,
  DepositItemSectorsResponse,
  DepositItemSuggestionsResponse,
  DepositItemsListResponse,
} from "./types";

export async function getDepositItem(token: string, id: string) {
  return apiRequest<ApiDepositItem>(`/Deposit/items/${id}`, {}, token);
}

export async function getDepositItemSectors(token: string, itemId: string) {
  return apiRequest<DepositItemSectorsResponse>(
    `/Deposit/items/${itemId}/sectors`,
    {},
    token,
  );
}

export async function listDepositItems(
  token: string,
  params?: { q?: string; page?: number; limit?: number; all?: boolean },
) {
  const query = buildQuery(params);
  return apiRequest<DepositItemsListResponse>(`/Deposit/items${query}`, {}, token);
}

export async function listDepositItemSuggestions(token: string) {
  return apiRequest<DepositItemSuggestionsResponse>(
    "/Deposit/items/suggestions",
    {},
    token,
  );
}

export async function createDepositItem(token: string, payload: DepositItemInput) {
  return apiRequest<ApiDepositItem>(
    "/Deposit/items",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateDepositItem(
  token: string,
  id: string,
  payload: Partial<DepositItemInput>,
) {
  return apiRequest<ApiDepositItem>(
    `/Deposit/items/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositItem(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/Deposit/items/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addDepositItemComment(
  token: string,
  id: string,
  payload: { body: string; mentionUserIds?: string[] },
) {
  return apiRequest<ApiDepositItem>(
    `/Deposit/items/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositItemComment(token: string, id: string, commentId: string) {
  return apiRequest<ApiDepositItem>(
    `/Deposit/items/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addDepositItemAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiDepositItem>(
    `/Deposit/items/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositItemAttachment(token: string, id: string, attachmentId: string) {
  return apiRequest<ApiDepositItem>(
    `/Deposit/items/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
