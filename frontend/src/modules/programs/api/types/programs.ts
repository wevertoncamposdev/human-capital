import type { ProgramsPagination } from "./shared";

export type ProgramType =
  | "SCFV"
  | "PAIF"
  | "PAEFI"
  | "CULTURAL"
  | "QUALIFICATION"
  | "OTHER";

export type ProgramStatus = "PLANNED" | "ACTIVE" | "CLOSED";

export type ApiProgram = {
  id: string;
  tenantId: string;
  name: string;
  type: ProgramType;
  description: string | null;
  tags: string[];
  internalNotes: string | null;
  status: ProgramStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  comments: ApiProgramComment[];
  attachments: ApiProgramAttachment[];
};

export type ApiProgramComment = {
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

export type ApiProgramAttachment = {
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

export type ProgramsListResponse = {
  data: ApiProgram[];
  pagination: ProgramsPagination;
};

export type ProgramInput = {
  name: string;
  type: ProgramType;
  description?: string | null;
  tags?: string[];
  internalNotes?: string | null;
  status?: ProgramStatus;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type ProgramCommentInput = {
  body: string;
  mentionUserIds?: string[];
};

export type ProgramAttachmentInput = {
  label: string;
  filePath: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
};
