"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type { ApiDepositDonor, DepositDonorInput, DepositDonorsListResponse } from "./types";

export async function listDepositDonors(
  token: string,
  params?: { page?: number; limit?: number; q?: string; search?: string },
) {
  const query = buildQuery(params);
  return apiRequest<DepositDonorsListResponse>(`/Deposit/donors${query}`, {}, token);
}

export async function createDepositDonor(token: string, payload: DepositDonorInput) {
  return apiRequest<ApiDepositDonor>(
    "/Deposit/donors",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function getDepositDonor(token: string, id: string) {
  return apiRequest<ApiDepositDonor>(`/Deposit/donors/${id}`, {}, token);
}

export async function updateDepositDonor(
  token: string,
  id: string,
  payload: Partial<DepositDonorInput>,
) {
  return apiRequest<ApiDepositDonor>(
    `/Deposit/donors/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositDonor(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/Deposit/donors/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addDepositDonorComment(
  token: string,
  id: string,
  payload: { body: string; mentionUserIds?: string[] },
) {
  return apiRequest<ApiDepositDonor>(
    `/Deposit/donors/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositDonorComment(token: string, id: string, commentId: string) {
  return apiRequest<ApiDepositDonor>(
    `/Deposit/donors/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addDepositDonorAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiDepositDonor>(
    `/Deposit/donors/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteDepositDonorAttachment(token: string, id: string, attachmentId: string) {
  return apiRequest<ApiDepositDonor>(
    `/Deposit/donors/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
