import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiProject,
  ProjectAttachmentInput,
  ProjectCommentInput,
  ProjectInput,
  ProjectsListResponse,
} from "./types";

export async function listProjects(
  token: string,
  params?: {
    q?: string;
    programId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    all?: boolean;
  },
) {
  const query = buildQuery(params);
  return apiRequest<ProjectsListResponse>(`/projects${query}`, {}, token);
}

export async function getProject(token: string, id: string) {
  return apiRequest<ApiProject>(`/projects/${id}`, {}, token);
}

export async function createProject(token: string, payload: ProjectInput) {
  return apiRequest<ApiProject>(
    "/projects",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateProject(
  token: string,
  id: string,
  payload: Partial<ProjectInput>,
) {
  return apiRequest<ApiProject>(
    `/projects/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProject(token: string, id: string) {
  return apiRequest<{ ok: true }>(
    `/projects/${id}`,
    { method: "DELETE" },
    token,
  );
}

export async function addProjectComment(
  token: string,
  id: string,
  payload: ProjectCommentInput,
) {
  return apiRequest<ApiProject>(
    `/projects/${id}/comments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProjectComment(
  token: string,
  id: string,
  commentId: string,
) {
  return apiRequest<ApiProject>(
    `/projects/${id}/comments/${commentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addProjectAttachment(
  token: string,
  id: string,
  payload: ProjectAttachmentInput,
) {
  return apiRequest<ApiProject>(
    `/projects/${id}/attachments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProjectAttachment(
  token: string,
  id: string,
  attachmentId: string,
) {
  return apiRequest<ApiProject>(
    `/projects/${id}/attachments/${attachmentId}`,
    { method: "DELETE" },
    token,
  );
}
