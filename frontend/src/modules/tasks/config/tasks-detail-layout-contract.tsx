"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { resolveMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  TASK_ATTACHMENT_AUDIT_FIELD_LABELS,
  TASK_AUDIT_FIELD_LABELS,
  TASK_CHECKLIST_AUDIT_FIELD_LABELS,
  TASK_COMMENT_AUDIT_FIELD_LABELS,
  TASK_DEPENDENCY_AUDIT_FIELD_LABELS,
  TASK_DUE_STATE_BADGE_CLASSNAMES,
  TASK_STATUS_BADGE_CLASSNAMES,
  TASK_SUBTASK_AUDIT_FIELD_LABELS,
} from "@/modules/tasks/shared/domain/tasks.constants";
import type {
  TaskAssignableUser,
  TaskAttachment,
  TaskChecklistItem,
  TaskComment,
  TaskCommentMutationInput,
  TaskDependency,
  TaskMutationInput,
  TaskRecord,
  TaskSubtask,
} from "@/modules/tasks/shared/domain/types";
import { TaskDetailForm } from "@/modules/tasks/shared/ui/task-detail-form";
import type { DetailShellAuditContext } from "@/web-client/detail/DetailShellEngine";
import { StandardDetailMetadataSide } from "@/web-client/detail/StandardDetailMetadataSide";
import type { DetailCommentUser, DetailLayoutConfig } from "@/web-client/registry/types";

const AUTO_SAVE_EDITING = {
  saveMode: "auto",
  autoSave: {
    trigger: "field-commit",
  },
} as const;

function formatHistoryDate(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 16).replace("T", ", ");
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function checklistColumns(): ColumnDef<TaskChecklistItem, unknown>[] {
  return [
    {
      accessorKey: "label",
      header: "Item",
      cell: ({ row }) => row.original.label,
    },
    {
      accessorKey: "notes",
      header: "Notas",
      cell: ({ row }) => row.original.notes?.trim() || "-",
    },
    {
      accessorKey: "owner",
      header: "Responsavel",
      cell: ({ row }) => row.original.owner ?? "-",
    },
    {
      accessorKey: "dueDate",
      header: "Entrega",
      cell: ({ row }) => row.original.dueDate ?? "-",
    },
    {
      id: "done",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "rounded-full px-2 text-[10px]",
            row.original.done
              ? "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
              : "border-transparent bg-slate-500/10 text-slate-700 dark:text-slate-200",
          )}
        >
          {row.original.done ? "Concluido" : "Pendente"}
        </Badge>
      ),
    },
  ];
}

function subtaskColumns(): ColumnDef<TaskSubtask, unknown>[] {
  return [
    {
      accessorKey: "title",
      header: "Subtarefa",
      cell: ({ row }) => row.original.title,
    },
    {
      accessorKey: "description",
      header: "Descricao",
      cell: ({ row }) => row.original.description?.trim() || "-",
    },
    {
      accessorKey: "startDate",
      header: "Inicio",
      cell: ({ row }) => row.original.startDate ?? "-",
    },
    {
      accessorKey: "owner",
      header: "Responsavel",
      cell: ({ row }) => row.original.owner ?? "-",
    },
    {
      accessorKey: "dueDate",
      header: "Entrega",
      cell: ({ row }) => row.original.dueDate ?? "-",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "rounded-full px-2 text-[10px]",
            TASK_STATUS_BADGE_CLASSNAMES[row.original.status],
          )}
        >
          {row.original.status}
        </Badge>
      ),
    },
  ];
}

function dependencyColumns(): ColumnDef<TaskDependency, unknown>[] {
  return [
    {
      accessorKey: "title",
      header: "Tarefa",
      cell: ({ row }) => row.original.title,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => row.original.status,
    },
    {
      accessorKey: "priority",
      header: "Prioridade",
      cell: ({ row }) => row.original.priority,
    },
    {
      accessorKey: "owner",
      header: "Responsavel",
      cell: ({ row }) => row.original.owner ?? "-",
    },
    {
      accessorKey: "dueDate",
      header: "Entrega",
      cell: ({ row }) => row.original.dueDate ?? "-",
    },
  ];
}

export type TasksDetailLayoutContext = DetailShellAuditContext & {
  task: TaskRecord;
  draft: TaskMutationInput;
  assignableUsers: TaskAssignableUser[];
  mentionableUsers: DetailCommentUser[];
  assignableUsersLoading: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<TaskMutationInput>>;
  onCommitField: <K extends keyof TaskMutationInput>(
    field: K,
    nextValue?: TaskMutationInput[K],
  ) => void;
  onCommitDraft: (nextDraft: TaskMutationInput) => void;
  onNotesChange: (next: string | null) => void;
  onNotesBlur: () => void;
  onAddChecklistItem: () => void;
  onToggleChecklistItem: (item: TaskChecklistItem) => void;
  onEditChecklistItem: (item: TaskChecklistItem) => void;
  onAddSubtask: () => void;
  onToggleSubtaskStatus: (item: TaskSubtask) => void;
  onEditSubtask: (item: TaskSubtask) => void;
  commentDraft: TaskCommentMutationInput;
  onCommentDraftChange: React.Dispatch<React.SetStateAction<TaskCommentMutationInput>>;
  onSubmitComment: () => void;
  onDeleteComment: (comment: TaskComment) => void;
  commentSubmitting: boolean;
  onUploadAttachment: () => void;
  onDeleteAttachment: (attachment: TaskAttachment) => void;
  attachmentUploading: boolean;
  onOpenDependencyCreate: () => void;
  onRemoveDependency: (dependency: TaskDependency) => void;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
  canAudit: boolean;
  canEdit: boolean;
};

function TaskDetailSide({
  task,
  draft,
  mentionableUsers,
  detailAudit,
  canAudit,
  canEdit,
  auditVisibleCount,
  onAuditVisibleCountChange,
  onNotesChange,
  onNotesBlur,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  onDeleteComment,
  commentSubmitting,
  onUploadAttachment,
  onDeleteAttachment,
  attachmentUploading,
  onDraftChange,
  onCommitField,
}: {
  task: TaskRecord;
  draft: TaskMutationInput;
  mentionableUsers: DetailCommentUser[];
  detailAudit?: DetailShellAuditContext["detailAudit"];
  canAudit: boolean;
  canEdit: boolean;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
  onNotesChange: (next: string | null) => void;
  onNotesBlur: () => void;
  commentDraft: TaskCommentMutationInput;
  onCommentDraftChange: React.Dispatch<React.SetStateAction<TaskCommentMutationInput>>;
  onSubmitComment: () => void;
  onDeleteComment: (comment: TaskComment) => void;
  commentSubmitting: boolean;
  onUploadAttachment: () => void;
  onDeleteAttachment: (attachment: TaskAttachment) => void;
  attachmentUploading: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<TaskMutationInput>>;
  onCommitField: <K extends keyof TaskMutationInput>(
    field: K,
    nextValue?: TaskMutationInput[K],
  ) => void;
}) {
  const historyItems = React.useMemo(
    () =>
      [
        {
          id: `task:created:${task.id}`,
          title: "Tarefa criada",
          description: task.summary?.trim() || "Registro principal criado.",
          meta: task.status,
          createdAt: task.createdAt,
        },
        ...(task.updatedAt !== task.createdAt
          ? [
              {
                id: `task:updated:${task.id}`,
                title: "Tarefa atualizada",
                description: "Os dados principais da tarefa foram alterados.",
                meta: task.updatedAt.slice(0, 10),
                createdAt: task.updatedAt,
              },
            ]
          : []),
        ...task.comments.map((comment) => ({
          id: `comment:${comment.id}`,
          title: `Comentario de ${comment.author.name}`,
          description: comment.body,
          meta: "Comentario",
          createdAt: comment.createdAt,
        })),
        ...task.checklist.map((item) => ({
          id: `checklist:${item.id}`,
          title: item.done ? "Checklist concluido" : "Checklist atualizado",
          description: item.label,
          meta: item.owner ?? "Checklist",
          createdAt: item.updatedAt ?? item.createdAt,
        })),
        ...task.subtasks.map((item) => ({
          id: `subtask:${item.id}`,
          title: "Subtarefa atualizada",
          description: item.title,
          meta: item.status,
          createdAt: item.updatedAt ?? item.createdAt,
        })),
        ...task.attachments.map((item) => ({
          id: `attachment:${item.id}`,
          title: "Anexo registrado",
          description: item.label,
          meta: item.uploadedBy?.name ?? "Anexo",
          createdAt: item.createdAt,
        })),
        ...task.dependencies.map((item) => ({
          id: `dependency:${item.id}`,
          title: "Dependencia vinculada",
          description: item.title,
          meta: "Bloqueada por",
          createdAt: null,
        })),
        ...task.dependents.map((item) => ({
          id: `dependent:${item.id}`,
          title: "Dependente vinculado",
          description: item.title,
          meta: "Esta tarefa desbloqueia",
          createdAt: null,
        })),
      ]
        .sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        })
        .map((item) => ({
          ...item,
          meta: item.meta ? `${item.meta}${item.createdAt ? ` • ${formatHistoryDate(item.createdAt)}` : ""}` : formatHistoryDate(item.createdAt),
        })),
    [task],
  );

  const normalizedHistoryItems = React.useMemo(
    () =>
      historyItems.map((item) => ({
        ...item,
        meta: item.meta
          ? item.meta.replaceAll("â€¢", "|").replaceAll("•", "|")
          : item.meta,
      })),
    [historyItems],
  );

  return (
    <StandardDetailMetadataSide
      mode="edit"
      readOnly={!canEdit}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      canAudit={canAudit}
      comments={{
        items: task.comments,
        draft: commentDraft,
        users: mentionableUsers,
        onDraftChange: onCommentDraftChange,
        onSubmit: onSubmitComment,
        onDelete: canEdit
          ? (commentId) => {
              const comment = task.comments.find((entry) => entry.id === commentId);
              if (comment) {
                onDeleteComment(comment);
              }
            }
          : undefined,
        submitting: commentSubmitting,
        readOnly: !canEdit,
      }}
      notes={{
        value: draft.internalNotes,
        onChange: onNotesChange,
        onBlur: onNotesBlur,
        readOnly: !canEdit,
      }}
      tags={{
        value: draft.tags,
        onChange: (nextTags) =>
          onDraftChange((previous) => ({ ...previous, tags: nextTags })),
        onCommit: (nextTags) => onCommitField("tags", nextTags),
        readOnly: !canEdit,
      }}
      attachments={{
        items: task.attachments.map((item) => ({
          id: item.id,
          label: item.label,
          href: resolveMediaUrl(item.filePath),
          description: item.uploadedBy?.name
            ? `Enviado por ${item.uploadedBy.name}`
            : "Anexo da tarefa",
          mimeType: item.mimeType ?? null,
          sizeLabel: formatFileSize(item.fileSizeBytes),
          statusLabel: item.createdAt ? formatHistoryDate(item.createdAt) : null,
        })),
        onUpload: onUploadAttachment,
        onDelete: canEdit
          ? (attachmentId) => {
              const attachment = task.attachments.find((entry) => entry.id === attachmentId);
              if (attachment) {
                onDeleteAttachment(attachment);
              }
            }
          : undefined,
        readOnly: !canEdit,
        emptyLabel: attachmentUploading
          ? "Enviando anexo..."
          : "Nenhum anexo cadastrado para esta tarefa.",
      }}
      history={{
        items: normalizedHistoryItems,
        emptyLabel: "Nenhum historico disponivel para esta tarefa.",
      }}
      contextItems={[
        { key: "owner", label: "Responsavel", value: task.owner ?? "-" },
        { key: "team", label: "Time", value: task.team ?? "-" },
        {
          key: "dueState",
          label: "Prazo",
          value: (
            <Badge
              className={cn(
                "rounded-full px-2 text-[10px]",
                TASK_DUE_STATE_BADGE_CLASSNAMES[task.dueState],
              )}
            >
              {task.dueState}
            </Badge>
          ),
        },
        { key: "milestone", label: "Marco", value: task.isMilestone ? "Sim" : "Nao" },
        { key: "checklist", label: "Checklist", value: task.checklist.length },
        { key: "subtasks", label: "Subtarefas", value: task.subtasks.length },
        { key: "comments", label: "Comentarios", value: task.comments.length },
        { key: "attachments", label: "Anexos", value: task.attachments.length },
      ]}
      defaultTab="activity"
    />
  );
}

export const tasksDetailLayout: DetailLayoutConfig<TasksDetailLayoutContext> = {
  editing: AUTO_SAVE_EDITING,
  header: {
    title: ({ task }) => task.title,
    slot: ({ task }) => (
      <div className="border-y border-border/60 bg-transparent px-0 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium text-foreground">{task.status}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Prioridade</div>
            <div className="font-medium text-foreground">{task.priority}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Prazo</div>
            <Badge
              className={cn(
                "rounded-full px-2 text-[10px]",
                TASK_DUE_STATE_BADGE_CLASSNAMES[task.dueState],
              )}
            >
              {task.dueState}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Entrega</div>
            <div className="font-medium text-foreground">{task.dueDate ?? "-"}</div>
          </div>
          {task.isMilestone ? (
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Marco</div>
              <div className="font-medium text-foreground">Sim</div>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Atualizado</div>
            <div className="font-medium text-foreground">{task.updatedAt.slice(0, 10)}</div>
          </div>
        </div>
      </div>
    ),
  },
  main: ({
    draft,
    assignableUsers,
    assignableUsersLoading,
    onDraftChange,
    onCommitField,
    onCommitDraft,
  }) => (
    <TaskDetailForm
      value={draft}
      assignableUsers={assignableUsers}
      assignableUsersLoading={assignableUsersLoading}
      onChange={onDraftChange}
      onCommitField={onCommitField}
      onCommitDraft={onCommitDraft}
    />
  ),
  side: ({
    task,
    draft,
    mentionableUsers,
    detailAudit,
    canAudit,
    canEdit,
    auditVisibleCount,
    onAuditVisibleCountChange,
    onNotesChange,
    onNotesBlur,
    commentDraft,
    onCommentDraftChange,
    onSubmitComment,
    onDeleteComment,
    commentSubmitting,
    onUploadAttachment,
    onDeleteAttachment,
    attachmentUploading,
    onDraftChange,
    onCommitField,
  }) => (
    <TaskDetailSide
      task={task}
      draft={draft}
      mentionableUsers={mentionableUsers}
      detailAudit={detailAudit}
      canAudit={canAudit}
      canEdit={canEdit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      onNotesChange={onNotesChange}
      onNotesBlur={onNotesBlur}
      commentDraft={commentDraft}
      onCommentDraftChange={onCommentDraftChange}
      onSubmitComment={onSubmitComment}
      onDeleteComment={onDeleteComment}
      commentSubmitting={commentSubmitting}
      onUploadAttachment={onUploadAttachment}
      onDeleteAttachment={onDeleteAttachment}
      attachmentUploading={attachmentUploading}
      onDraftChange={onDraftChange}
      onCommitField={onCommitField}
    />
  ),
  tabTemplates: [
    {
      key: "checklist",
      label: "Checklist",
      badge: ({ task }) => task.checklist.length,
      content: () => (
        <div className="text-sm text-muted-foreground">
          Itens operacionais ligados a esta tarefa.
        </div>
      ),
      relations: [
        {
          key: "checklist-items",
          label: "Checklist",
          rows: ({ task }) => task.checklist,
          columns: checklistColumns(),
          getRowId: (row) => row.id,
          onRowClick: (row, { onEditChecklistItem }) => onEditChecklistItem(row),
          emptyLabel: "Nenhum item no checklist.",
          action: {
            label: "Novo item",
            onClick: ({ onAddChecklistItem }) => onAddChecklistItem(),
            hidden: ({ canEdit }) => !canEdit,
          },
        },
      ],
    },
    {
      key: "subtasks",
      label: "Subtarefas",
      badge: ({ task }) => task.subtasks.length,
      content: () => (
        <div className="text-sm text-muted-foreground">
          Desdobramentos da entrega principal.
        </div>
      ),
      relations: [
        {
          key: "subtask-items",
          label: "Subtarefas",
          rows: ({ task }) => task.subtasks,
          columns: subtaskColumns(),
          getRowId: (row) => row.id,
          onRowClick: (row, { onEditSubtask }) => onEditSubtask(row),
          emptyLabel: "Nenhuma subtarefa cadastrada.",
          action: {
            label: "Nova subtarefa",
            onClick: ({ onAddSubtask }) => onAddSubtask(),
            hidden: ({ canEdit }) => !canEdit,
          },
        },
      ],
    },
    {
      key: "dependencies",
      label: "Dependencias",
      badge: ({ task }) => task.dependencies.length + task.dependents.length,
      content: () => (
        <div className="text-sm text-muted-foreground">
          Relacoes entre tarefas que bloqueiam ou dependem desta entrega.
        </div>
      ),
      relations: [
        {
          key: "blocked-by",
          label: "Bloqueada por",
          rows: ({ task }) => task.dependencies,
          columns: dependencyColumns(),
          getRowId: (row) => row.id,
          onRowClick: (row, { onRemoveDependency }) => onRemoveDependency(row),
          emptyLabel: "Nenhuma dependencia cadastrada.",
          action: {
            label: "Nova dependencia",
            onClick: ({ onOpenDependencyCreate }) => onOpenDependencyCreate(),
            hidden: ({ canEdit }) => !canEdit,
          },
        },
        {
          key: "blocking",
          label: "Esta tarefa desbloqueia",
          rows: ({ task }) => task.dependents,
          columns: dependencyColumns(),
          getRowId: (row) => row.id,
          emptyLabel: "Nenhuma tarefa dependente.",
        },
      ],
    },
  ],
  auditSources: {
    primaryEntity: {
      key: "task",
      entity: "TaskOrganizerTask",
      model: "tasks.audit",
      label: "Tarefa",
      fieldLabels: TASK_AUDIT_FIELD_LABELS,
      valueFormatters: {
        progress: (value) => `${Number(value ?? 0)}%`,
        tags: (value) =>
          Array.isArray(value) ? value.map((entry) => String(entry)).join(", ") : "-",
      },
      resolveEntityId: ({ task }) => task.id,
    },
    relatedEntities: [
      {
        key: "checklist",
        entity: "TaskOrganizerChecklistItem",
        model: "tasks.audit",
        label: "Checklist",
        fieldLabels: TASK_CHECKLIST_AUDIT_FIELD_LABELS,
        valueFormatters: {
          done: (value) => (value ? "Concluido" : "Pendente"),
        },
        resolveEntityIds: ({ task }) => task.checklist.map((item) => item.id),
      },
      {
        key: "subtask",
        entity: "TaskOrganizerSubtask",
        model: "tasks.audit",
        label: "Subtarefa",
        fieldLabels: TASK_SUBTASK_AUDIT_FIELD_LABELS,
        resolveEntityIds: ({ task }) => task.subtasks.map((item) => item.id),
      },
      {
        key: "comment",
        entity: "TaskOrganizerComment",
        model: "tasks.audit",
        label: "Comentario",
        fieldLabels: TASK_COMMENT_AUDIT_FIELD_LABELS,
        valueFormatters: {
          mentionUserIds: (value, { context }) =>
            Array.isArray(value)
              ? value
                  .map((entry) =>
                    context.assignableUsers.find((user) => user.id === String(entry))?.name ??
                    context.mentionableUsers.find((user) => user.id === String(entry))?.name ??
                    String(entry),
                  )
                  .join(", ")
              : "-",
        },
        resolveEntityIds: ({ task }) => task.comments.map((item) => item.id),
      },
      {
        key: "attachment",
        entity: "TaskOrganizerAttachment",
        model: "tasks.audit",
        label: "Anexo",
        fieldLabels: TASK_ATTACHMENT_AUDIT_FIELD_LABELS,
        valueFormatters: {
          fileSizeBytes: (value) => formatFileSize(Number(value ?? 0)) ?? "-",
        },
        resolveEntityIds: ({ task }) => task.attachments.map((item) => item.id),
      },
      {
        key: "dependency",
        entity: "TaskOrganizerTaskDependency",
        model: "tasks.audit",
        label: "Dependencia",
        fieldLabels: TASK_DEPENDENCY_AUDIT_FIELD_LABELS,
        resolveEntityIds: ({ task }) => [
          ...task.dependencies.map((item) => item.id),
          ...task.dependents.map((item) => item.id),
        ],
      },
    ],
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};
