import type { ProjectsPagination } from "./shared";
import type { ProgramStatus, ProgramType } from "@/modules/programs/api";

export type ProjectStatus = "PLANNED" | "ACTIVE" | "CLOSED";

export type ApiProjectProgram = {
  id: string;
  name: string;
  type?: ProgramType;
  status?: ProgramStatus;
};

export type ApiProjectComment = {
  id: string;
  body: string;
  mentionUserIds: string[];
  author: {
    id: string | null;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type ApiProjectAttachment = {
  id: string;
  label: string;
  filePath: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedBy: {
    id: string | null;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiProject = {
  id: string;
  tenantId: string;
  programId: string;
  name: string;
  description: string | null;
  tags: string[];
  internalNotes: string | null;
  status: ProjectStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  program: ApiProjectProgram;
  comments: ApiProjectComment[];
  attachments: ApiProjectAttachment[];
};

export type ProjectsListResponse = {
  data: ApiProject[];
  pagination: ProjectsPagination;
};

export type ProjectCommentInput = {
  body: string;
  mentionUserIds?: string[];
};

export type ProjectAttachmentInput = {
  label: string;
  filePath: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
};

export type ProjectInput = {
  programId: string;
  name: string;
  description?: string | null;
  tags?: string[];
  internalNotes?: string | null;
  status?: ProjectStatus;
  startsAt?: string | null;
  endsAt?: string | null;
};
