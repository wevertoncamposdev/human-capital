"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiProjectAction,
  ProjectActionAttachmentInput,
  ProjectActionCommentInput,
  ProjectActionInput,
  ProjectActionsListResponse,
} from "./types";

export async function listProjectActions(
  token: string,
  projectId: string,
  params?: {
    q?: string;
    mine?: boolean;
    status?: string;
    actionTypeId?: string;
    projectGroupId?: string;
    peopleGroupId?: string;
    targetEnrollmentId?: string;
    page?: number;
    limit?: number;
  },
) {
  const query = buildQuery({
    ...params,
    groupId: params?.projectGroupId,
    peopleGroupId: params?.peopleGroupId,
  });
  return apiRequest<ProjectActionsListResponse>(
    `/projects/${projectId}/actions${query}`,
    {},
    token,
  );
}

export async function listActions(
  token: string,
  params?: {
    q?: string;
    mine?: boolean;
    status?: string;
    actionTypeId?: string;
    projectId?: string;
    projectGroupId?: string;
    peopleGroupId?: string;
    targetEnrollmentId?: string;
    page?: number;
    limit?: number;
  },
) {
  const query = buildQuery({
    ...params,
    groupId: params?.projectGroupId,
    peopleGroupId: params?.peopleGroupId,
  });
  return apiRequest<ProjectActionsListResponse>(`/actions${query}`, {}, token);
}

export async function getProjectAction(
  token: string,
  projectId: string,
  actionId: string,
) {
  return apiRequest<ApiProjectAction>(
    `/projects/${projectId}/actions/${actionId}`,
    {},
    token,
  );
}

export async function createProjectAction(
  token: string,
  projectId: string,
  payload: ProjectActionInput,
) {
  return apiRequest<ApiProjectAction>(
    `/projects/${projectId}/actions`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateProjectAction(
  token: string,
  projectId: string,
  actionId: string,
  payload: Partial<ProjectActionInput>,
) {
  return apiRequest<ApiProjectAction>(
    `/projects/${projectId}/actions/${actionId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProjectAction(
  token: string,
  projectId: string,
  actionId: string,
) {
  return apiRequest<{ ok: true }>(
    `/projects/${projectId}/actions/${actionId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addProjectActionComment(
  token: string,
  projectId: string,
  actionId: string,
  payload: ProjectActionCommentInput,
) {
  return apiRequest<ApiProjectAction>(
    `/projects/${projectId}/actions/${actionId}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProjectActionComment(
  token: string,
  projectId: string,
  actionId: string,
  commentId: string,
) {
  return apiRequest<ApiProjectAction>(
    `/projects/${projectId}/actions/${actionId}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addProjectActionAttachment(
  token: string,
  projectId: string,
  actionId: string,
  payload: ProjectActionAttachmentInput,
) {
  return apiRequest<ApiProjectAction>(
    `/projects/${projectId}/actions/${actionId}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProjectActionAttachment(
  token: string,
  projectId: string,
  actionId: string,
  attachmentId: string,
) {
  return apiRequest<ApiProjectAction>(
    `/projects/${projectId}/actions/${actionId}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
