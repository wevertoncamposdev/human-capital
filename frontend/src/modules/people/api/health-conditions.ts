import { apiRequest } from "@/lib/api";
import type { ApiHealthCondition } from "./types";

export async function getPersonHealthConditions(token: string, id: string) {
  return apiRequest<ApiHealthCondition[]>(
    `/people/${id}/health-conditions`,
    {},
    token,
  );
}

export async function createPersonHealthCondition(
  token: string,
  id: string,
  payload: Omit<ApiHealthCondition, "id" | "personId" | "createdAt" | "updatedAt">,
) {
  return apiRequest<ApiHealthCondition>(
    `/people/${id}/health-conditions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePersonHealthCondition(
  token: string,
  id: string,
  conditionId: string,
  payload: Partial<
    Omit<ApiHealthCondition, "id" | "personId" | "createdAt" | "updatedAt">
  >,
) {
  return apiRequest<ApiHealthCondition>(
    `/people/${id}/health-conditions/${conditionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonHealthCondition(
  token: string,
  id: string,
  conditionId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}/health-conditions/${conditionId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

