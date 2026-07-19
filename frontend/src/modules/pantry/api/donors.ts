"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type { ApiPantryDonor, PantryDonorInput, PantryDonorsListResponse } from "./types";

export async function listPantryDonors(
  token: string,
  params?: { page?: number; limit?: number; q?: string; search?: string },
) {
  const query = buildQuery(params);
  return apiRequest<PantryDonorsListResponse>(`/pantry/donors${query}`, {}, token);
}

export async function createPantryDonor(token: string, payload: PantryDonorInput) {
  return apiRequest<ApiPantryDonor>(
    "/pantry/donors",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function getPantryDonor(token: string, id: string) {
  return apiRequest<ApiPantryDonor>(`/pantry/donors/${id}`, {}, token);
}

export async function updatePantryDonor(
  token: string,
  id: string,
  payload: Partial<PantryDonorInput>,
) {
  return apiRequest<ApiPantryDonor>(
    `/pantry/donors/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryDonor(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/pantry/donors/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addPantryDonorComment(
  token: string,
  id: string,
  payload: { body: string; mentionUserIds?: string[] },
) {
  return apiRequest<ApiPantryDonor>(
    `/pantry/donors/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryDonorComment(token: string, id: string, commentId: string) {
  return apiRequest<ApiPantryDonor>(
    `/pantry/donors/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addPantryDonorAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiPantryDonor>(
    `/pantry/donors/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePantryDonorAttachment(token: string, id: string, attachmentId: string) {
  return apiRequest<ApiPantryDonor>(
    `/pantry/donors/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
