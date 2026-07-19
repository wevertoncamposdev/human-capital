import { apiRequest } from "@/lib/api";
import type { ApiPersonDetention } from "./types";

export async function getPersonDetentions(token: string, id: string) {
  return apiRequest<ApiPersonDetention[]>(`/people/${id}/detentions`, {}, token);
}

export async function createPersonDetention(
  token: string,
  id: string,
  payload: Omit<ApiPersonDetention, "id" | "personId" | "createdAt" | "updatedAt">,
) {
  return apiRequest<ApiPersonDetention>(
    `/people/${id}/detentions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePersonDetention(
  token: string,
  id: string,
  detentionId: string,
  payload: Partial<
    Omit<ApiPersonDetention, "id" | "personId" | "createdAt" | "updatedAt">
  >,
) {
  return apiRequest<ApiPersonDetention>(
    `/people/${id}/detentions/${detentionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonDetention(
  token: string,
  id: string,
  detentionId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}/detentions/${detentionId}`,
    { method: "DELETE" },
    token,
  );
}

