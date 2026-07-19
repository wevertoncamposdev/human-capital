"use client";

import { apiRequest } from "@/lib/api";
import type { ApiPersonContact, PersonContactInput } from "./types";

export async function listPersonContacts(token: string, personId: string) {
  return apiRequest<ApiPersonContact[]>(
    `/people/${personId}/contacts`,
    {},
    token,
  );
}

export async function createPersonContact(
  token: string,
  personId: string,
  payload: PersonContactInput,
) {
  return apiRequest<ApiPersonContact>(
    `/people/${personId}/contacts`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePersonContact(
  token: string,
  personId: string,
  contactId: string,
  payload: Partial<PersonContactInput>,
) {
  return apiRequest<ApiPersonContact>(
    `/people/${personId}/contacts/${contactId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonContact(
  token: string,
  personId: string,
  contactId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${personId}/contacts/${contactId}`,
    { method: "DELETE" },
    token,
  );
}

