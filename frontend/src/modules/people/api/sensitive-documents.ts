"use client";

import { apiRequest } from "@/lib/api";
import type {
  ApiPersonSensitiveDocuments,
  PersonSensitiveDocumentsInput,
} from "./types";

export async function getPersonSensitiveDocuments(token: string, personId: string) {
  return apiRequest<ApiPersonSensitiveDocuments | null>(
    `/people/${personId}/sensitive-documents`,
    {},
    token,
  );
}

export async function upsertPersonSensitiveDocuments(
  token: string,
  personId: string,
  payload: PersonSensitiveDocumentsInput,
) {
  return apiRequest<ApiPersonSensitiveDocuments>(
    `/people/${personId}/sensitive-documents`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

