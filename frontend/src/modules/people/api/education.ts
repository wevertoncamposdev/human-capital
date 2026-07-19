import { apiRequest } from "@/lib/api";
import type { ApiPersonEducation } from "./types";

export async function getPersonEducations(token: string, id: string) {
  return apiRequest<ApiPersonEducation[]>(`/people/${id}/educations`, {}, token);
}

export async function createPersonEducation(
  token: string,
  id: string,
  payload: Omit<ApiPersonEducation, "id" | "personId" | "createdAt" | "updatedAt">,
) {
  return apiRequest<ApiPersonEducation>(
    `/people/${id}/educations`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePersonEducation(
  token: string,
  id: string,
  educationId: string,
  payload: Partial<
    Omit<ApiPersonEducation, "id" | "personId" | "createdAt" | "updatedAt">
  >,
) {
  return apiRequest<ApiPersonEducation>(
    `/people/${id}/educations/${educationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonEducation(
  token: string,
  id: string,
  educationId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}/educations/${educationId}`,
    { method: "DELETE" },
    token,
  );
}

