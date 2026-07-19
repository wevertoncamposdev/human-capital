import { apiRequest } from "@/lib/api";
import type {
  ApiFamilyIncomeSummary,
  ApiFamilySummary,
  ApiPersonFinancialEntry,
} from "./types";

export async function getPersonFinancialEntries(token: string, id: string) {
  return apiRequest<ApiPersonFinancialEntry[]>(
    `/people/${id}/financial-entries`,
    {},
    token,
  );
}

export async function createPersonFinancialEntry(
  token: string,
  id: string,
  payload: Omit<
    ApiPersonFinancialEntry,
    "id" | "personId" | "createdAt" | "updatedAt"
  >,
) {
  return apiRequest<ApiPersonFinancialEntry>(
    `/people/${id}/financial-entries`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePersonFinancialEntry(
  token: string,
  id: string,
  entryId: string,
  payload: Partial<
    Omit<ApiPersonFinancialEntry, "id" | "personId" | "createdAt" | "updatedAt">
  >,
) {
  return apiRequest<ApiPersonFinancialEntry>(
    `/people/${id}/financial-entries/${entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonFinancialEntry(
  token: string,
  id: string,
  entryId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}/financial-entries/${entryId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function getFamilyIncomeSummary(token: string, id: string) {
  return apiRequest<ApiFamilyIncomeSummary>(
    `/people/${id}/family-income-summary`,
    {},
    token,
  );
}

export async function getFamilySummary(token: string, id: string) {
  return apiRequest<ApiFamilySummary>(`/people/${id}/family-summary`, {}, token);
}
