import { apiRequest } from "@/lib/api";
import type { ApiMedication } from "./types";

export async function getPersonMedications(token: string, id: string) {
  return apiRequest<ApiMedication[]>(`/people/${id}/medications`, {}, token);
}

export async function createPersonMedication(
  token: string,
  id: string,
  payload: Omit<ApiMedication, "id" | "personId" | "createdAt" | "updatedAt">,
) {
  return apiRequest<ApiMedication>(
    `/people/${id}/medications`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePersonMedication(
  token: string,
  id: string,
  medicationId: string,
  payload: Partial<
    Omit<ApiMedication, "id" | "personId" | "createdAt" | "updatedAt">
  >,
) {
  return apiRequest<ApiMedication>(
    `/people/${id}/medications/${medicationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonMedication(
  token: string,
  id: string,
  medicationId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}/medications/${medicationId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

