import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiPeopleRecordMetadata,
  ApiPeopleRecordType,
  ApiPerson,
  ApiPersonIdentityResponse,
  PeopleListResponse,
  PersonInput,
} from "./types";

export async function listPeople(
  token: string,
  params?: {
    q?: string;
    page?: number;
    limit?: number;
    all?: boolean;
    filters?: string;
    groupBy?: string;
  },
) {
  const query = buildQuery(params);
  return apiRequest<PeopleListResponse>(`/people${query}`, {}, token);
}

export async function getPerson(token: string, id: string) {
  return apiRequest<ApiPerson>(`/people/${id}`, {}, token);
}

export async function getPersonIdentity(token: string, id: string) {
  return apiRequest<ApiPersonIdentityResponse>(`/people/${id}/identity`, {}, token);
}

export async function createPerson(token: string, payload: PersonInput) {
  return apiRequest<ApiPerson>(
    "/people",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePerson(
  token: string,
  id: string,
  payload: PersonInput,
) {
  return apiRequest<ApiPerson>(
    `/people/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePerson(token: string, id: string) {
  return apiRequest<{ deleted: boolean }>(
    `/people/${id}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function addPersonComment(
  token: string,
  id: string,
  payload: {
    body: string;
    mentionUserIds?: string[];
  },
) {
  return apiRequest<ApiPerson>(
    `/people/${id}/comments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonComment(
  token: string,
  id: string,
  commentId: string,
) {
  return apiRequest<ApiPerson>(
    `/people/${id}/comments/${commentId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function addPersonAttachment(
  token: string,
  id: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiPerson>(
    `/people/${id}/attachments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePersonAttachment(
  token: string,
  id: string,
  attachmentId: string,
) {
  return apiRequest<ApiPerson>(
    `/people/${id}/attachments/${attachmentId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function getPeopleRecordMetadata(
  token: string,
  personId: string,
  recordType: ApiPeopleRecordType,
  recordId: string,
) {
  return apiRequest<ApiPeopleRecordMetadata>(
    `/people/${personId}/records/${recordType}/${recordId}/metadata`,
    {},
    token,
  );
}

export async function addPeopleRecordComment(
  token: string,
  personId: string,
  recordType: ApiPeopleRecordType,
  recordId: string,
  payload: {
    body: string;
    mentionUserIds?: string[];
  },
) {
  return apiRequest<ApiPeopleRecordMetadata>(
    `/people/${personId}/records/${recordType}/${recordId}/comments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePeopleRecordComment(
  token: string,
  personId: string,
  recordType: ApiPeopleRecordType,
  recordId: string,
  commentId: string,
) {
  return apiRequest<ApiPeopleRecordMetadata>(
    `/people/${personId}/records/${recordType}/${recordId}/comments/${commentId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function addPeopleRecordAttachment(
  token: string,
  personId: string,
  recordType: ApiPeopleRecordType,
  recordId: string,
  payload: {
    label: string;
    filePath: string;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
  },
) {
  return apiRequest<ApiPeopleRecordMetadata>(
    `/people/${personId}/records/${recordType}/${recordId}/attachments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePeopleRecordAttachment(
  token: string,
  personId: string,
  recordType: ApiPeopleRecordType,
  recordId: string,
  attachmentId: string,
) {
  return apiRequest<ApiPeopleRecordMetadata>(
    `/people/${personId}/records/${recordType}/${recordId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function setPeopleRecordTags(
  token: string,
  personId: string,
  recordType: ApiPeopleRecordType,
  recordId: string,
  tags: string[],
) {
  return apiRequest<ApiPeopleRecordMetadata>(
    `/people/${personId}/records/${recordType}/${recordId}/tags`,
    {
      method: "PUT",
      body: JSON.stringify({ tags }),
    },
    token,
  );
}
