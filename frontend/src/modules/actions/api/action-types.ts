"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type { ApiActionType } from "./types";

export async function listActionTypes(
  token: string,
  params?: { q?: string; isActive?: boolean },
) {
  const query = buildQuery({
    q: params?.q,
    isActive:
      params?.isActive === undefined ? undefined : String(params.isActive),
  });
  return apiRequest<ApiActionType[]>(`/action-types${query}`, {}, token);
}

export async function createActionType(
  token: string,
  payload: {
    name: string;
    description?: string | null;
    target?: "PROJECT" | "PROJECT_GROUP" | "PEOPLE_GROUP" | "ENROLLMENT";
    isActive?: boolean;
  },
) {
  return apiRequest<ApiActionType>(
    "/action-types",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateActionType(
  token: string,
  id: string,
  payload: Partial<{
    name: string;
    description: string | null;
    target: "PROJECT" | "PROJECT_GROUP" | "PEOPLE_GROUP" | "ENROLLMENT";
    isActive: boolean;
  }>,
) {
  return apiRequest<ApiActionType>(
    `/action-types/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteActionType(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/action-types/${id}`,
    { method: "DELETE" },
    token,
  );
}
