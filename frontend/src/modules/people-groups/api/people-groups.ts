import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiPeopleGroup,
  ApiPeopleGroupParticipation,
  CreatePeopleGroupParticipationInput,
  EndPeopleGroupParticipationInput,
  PeopleGroupInput,
  PeopleGroupParticipationsListResponse,
  PeopleGroupsListResponse,
} from "./types";

export async function listPeopleGroups(
  token: string,
  params?: {
    q?: string;
    groupType?: string;
    purpose?: "PUBLICO" | "EQUIPE";
    category?: string;
    isActive?: boolean;
    ageMin?: number;
    ageMax?: number;
    page?: number;
    limit?: number;
    all?: boolean;
  },
) {
  const query = buildQuery(params);
  return apiRequest<PeopleGroupsListResponse>(`/people-groups${query}`, {}, token);
}

export async function getPeopleGroup(token: string, id: string) {
  return apiRequest<ApiPeopleGroup>(`/people-groups/${id}`, {}, token);
}

export async function createPeopleGroup(token: string, payload: PeopleGroupInput) {
  return apiRequest<ApiPeopleGroup>(
    "/people-groups",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updatePeopleGroup(
  token: string,
  id: string,
  payload: Partial<PeopleGroupInput>,
) {
  return apiRequest<ApiPeopleGroup>(
    `/people-groups/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deletePeopleGroup(token: string, id: string) {
  return apiRequest<{ ok: true }>(`/people-groups/${id}`, { method: "DELETE" }, token);
}

export async function listPeopleGroupParticipations(
  token: string,
  peopleGroupId: string,
  params?: {
    q?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    all?: boolean;
  },
) {
  const query = buildQuery(params);
  return apiRequest<PeopleGroupParticipationsListResponse>(
    `/people-groups/${peopleGroupId}/participations${query}`,
    {},
    token,
  );
}

export async function createPeopleGroupParticipation(
  token: string,
  peopleGroupId: string,
  payload: CreatePeopleGroupParticipationInput,
) {
  return apiRequest<ApiPeopleGroupParticipation>(
    `/people-groups/${peopleGroupId}/participations`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function endPeopleGroupParticipation(
  token: string,
  peopleGroupId: string,
  participationId: string,
  payload?: EndPeopleGroupParticipationInput,
) {
  return apiRequest<ApiPeopleGroupParticipation>(
    `/people-groups/${peopleGroupId}/participations/${participationId}/end`,
    { method: "PATCH", body: JSON.stringify(payload ?? {}) },
    token,
  );
}
