import { apiRequest } from "@/lib/api";
import type {
  ApiPersonRelation,
  ApiPersonRelationsResponse,
  PersonRelationInput,
} from "./types";

export async function getPersonRelations(token: string, id: string) {
  return apiRequest<ApiPersonRelationsResponse>(
    `/people/${id}/relations`,
    {},
    token,
  );
}

export async function createPersonRelation(
  token: string,
  id: string,
  payload: PersonRelationInput,
) {
  return apiRequest<ApiPersonRelation>(
    `/people/${id}/relations`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePersonRelation(
  token: string,
  id: string,
  relationId: string,
  payload: Partial<PersonRelationInput>,
) {
  return apiRequest<ApiPersonRelation>(
    `/people/${id}/relations/${relationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonRelation(
  token: string,
  id: string,
  relationId: string,
) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}/relations/${relationId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

