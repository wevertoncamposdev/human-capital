"use client";

import type { TaskKind, TaskPriority, TaskStatus } from "@/modules/tasks/shared/domain/types";

export const TASK_STATUS_OPTIONS: TaskStatus[] = [
  "Backlog",
  "Em andamento",
  "Em revisao",
  "Concluida",
  "Bloqueada",
];

export const TASK_PRIORITY_OPTIONS: TaskPriority[] = [
  "Baixa",
  "Media",
  "Alta",
  "Critica",
];

export const TASK_KIND_OPTIONS: TaskKind[] = ["Feature", "Bug", "Rotina"];

export const TASK_STATUS_BADGE_CLASSNAMES: Record<TaskStatus, string> = {
  Backlog: "border-transparent bg-slate-500/10 text-slate-700 dark:text-slate-200",
  "Em andamento": "border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-200",
  "Em revisao": "border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-200",
  Concluida: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  Bloqueada: "border-transparent bg-rose-500/10 text-rose-700 dark:text-rose-200",
};

export const TASK_PRIORITY_BADGE_CLASSNAMES: Record<TaskPriority, string> = {
  Baixa: "border-transparent bg-slate-500/10 text-slate-700 dark:text-slate-200",
  Media: "border-transparent bg-indigo-500/10 text-indigo-700 dark:text-indigo-200",
  Alta: "border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-200",
  Critica: "border-transparent bg-rose-500/10 text-rose-700 dark:text-rose-200",
};

export const TASK_DUE_STATE_BADGE_CLASSNAMES = {
  "Sem prazo": "border-transparent bg-slate-500/10 text-slate-700 dark:text-slate-200",
  Atrasada: "border-transparent bg-rose-500/10 text-rose-700 dark:text-rose-200",
  Hoje: "border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-200",
  Proxima: "border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-200",
  Planejada: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  Concluida: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
} as const;

export const TASK_AUDIT_FIELD_LABELS: Record<string, string> = {
  title: "Titulo",
  summary: "Resumo",
  description: "Descricao",
  status: "Status",
  priority: "Prioridade",
  kind: "Tipo",
  owner: "Responsavel",
  team: "Time",
  startDate: "Inicio",
  dueDate: "Entrega",
  isMilestone: "Marco",
  progress: "Progresso",
  effortPoints: "Pontos",
  tags: "Tags",
  internalNotes: "Notas internas",
};

export const TASK_CHECKLIST_AUDIT_FIELD_LABELS: Record<string, string> = {
  label: "Item",
  done: "Concluido",
  owner: "Responsavel",
  ownerUserId: "Responsavel",
  dueDate: "Entrega",
  notes: "Notas",
};

export const TASK_SUBTASK_AUDIT_FIELD_LABELS: Record<string, string> = {
  title: "Subtarefa",
  status: "Status",
  owner: "Responsavel",
  ownerUserId: "Responsavel",
  startDate: "Inicio",
  dueDate: "Entrega",
  description: "Descricao",
};

export const TASK_COMMENT_AUDIT_FIELD_LABELS: Record<string, string> = {
  body: "Comentario",
  mentionUserIds: "Mencoes",
};

export const TASK_DEPENDENCY_AUDIT_FIELD_LABELS: Record<string, string> = {
  taskId: "Tarefa",
  dependsOnTaskId: "Depende de",
};

export const TASK_ATTACHMENT_AUDIT_FIELD_LABELS: Record<string, string> = {
  label: "Arquivo",
  filePath: "Caminho",
  mimeType: "Tipo",
  fileSizeBytes: "Tamanho",
  uploadedByUserId: "Enviado por",
};
