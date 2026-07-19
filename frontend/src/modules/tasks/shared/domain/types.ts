"use client";

import type { DetailAuditLog } from "@/web-client/detail/audit-types";

export type TaskStatus =
  | "Backlog"
  | "Em andamento"
  | "Em revisao"
  | "Concluida"
  | "Bloqueada";

export type TaskPriority = "Baixa" | "Media" | "Alta" | "Critica";

export type TaskKind = "Feature" | "Bug" | "Rotina";

export type TaskChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  owner?: string | null;
  ownerUserId?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskSubtask = {
  id: string;
  title: string;
  status: TaskStatus;
  owner?: string | null;
  ownerUserId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskComment = {
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

export type TaskDependency = {
  id: string;
  direction: "blocked_by" | "blocks";
  taskId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  owner?: string | null;
  ownerUserId?: string | null;
  dueDate?: string | null;
};

export type TaskAttachment = {
  id: string;
  label: string;
  filePath: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  uploadedBy?: {
    id: string | null;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskRecord = {
  id: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  kind: TaskKind;
  owner?: string | null;
  ownerUserId?: string | null;
  team?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  isMilestone: boolean;
  progress: number;
  effortPoints?: number | null;
  tags: string[];
  internalNotes?: string | null;
  dueState: "Sem prazo" | "Atrasada" | "Hoje" | "Proxima" | "Planejada" | "Concluida";
  isOverdue: boolean;
  daysUntilDue: number | null;
  checklist: TaskChecklistItem[];
  subtasks: TaskSubtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  dependencies: TaskDependency[];
  dependents: TaskDependency[];
  createdAt: string;
  updatedAt: string;
};

export type TaskMutationInput = {
  title: string;
  summary?: string | null;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  kind: TaskKind;
  owner?: string | null;
  ownerUserId?: string | null;
  team?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  isMilestone: boolean;
  progress: number;
  effortPoints?: number | null;
  tags: string[];
  internalNotes?: string | null;
};

export type TaskAuditLog = DetailAuditLog;

export type TaskAssignableUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type TaskChecklistItemMutationInput = {
  label: string;
  done: boolean;
  owner?: string | null;
  ownerUserId?: string | null;
  dueDate?: string | null;
  notes?: string | null;
};

export type TaskSubtaskMutationInput = {
  title: string;
  status: TaskStatus;
  owner?: string | null;
  ownerUserId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  description?: string | null;
};

export type TaskCommentMutationInput = {
  body: string;
  mentionUserIds: string[];
};

export type TaskAttachmentMutationInput = {
  label: string;
  filePath: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
};
