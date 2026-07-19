"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { useMentionableUsers } from "@/features/auth/use-mentionable-users";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { uploadTaskAttachment } from "@/features/uploads/api";
import { cn } from "@/lib/utils";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  tasksDetailModuleDefinition,
  TASKS_ROUTES,
} from "@/modules/tasks/config/tasks-module-contract";
import type { TasksDetailLayoutContext } from "@/modules/tasks/config/tasks-detail-layout-contract";
import type {
  TaskAssignableUser,
  TaskAttachment,
  TaskChecklistItem,
  TaskChecklistItemMutationInput,
  TaskComment,
  TaskCommentMutationInput,
  TaskDependency,
  TaskMutationInput,
  TaskRecord,
  TaskSubtask,
  TaskSubtaskMutationInput,
} from "@/modules/tasks/shared/domain/types";
import {
  TaskChecklistItemForm,
  TaskSubtaskForm,
} from "@/modules/tasks/shared/ui/task-related-item-forms";
import {
  addTaskChecklistItemRemote,
  addTaskAttachmentRemote,
  addTaskCommentRemote,
  addTaskDependencyRemote,
  addTaskSubtaskRemote,
  deleteTaskChecklistItemRemote,
  deleteTaskAttachmentRemote,
  deleteTaskCommentRemote,
  deleteTaskDependencyRemote,
  deleteTaskSubtaskRemote,
  listTaskAssignableUsersRemote,
  searchTasks,
  toggleTaskChecklistItemRemote,
  toggleTaskSubtaskStatusRemote,
  updateTaskChecklistItemRemote,
  updateTaskSubtaskRemote,
} from "@/web-client/data-provider/rest/tasks";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailRelationItemDialog } from "@/web-client/detail/DetailRelationItemDialog";
import {
  resumeDetailAutoSave,
  suspendDetailAutoSave,
} from "@/web-client/detail/detail-media-autosave-guard";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { normalizeTags } from "@/web-client/detail/tag-utils";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import {
  canUseModuleAction,
  getModuleDetailEditingConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";

const EMPTY_COMMENT_DRAFT: TaskCommentMutationInput = {
  body: "",
  mentionUserIds: [],
};

function buildDraft(task: TaskRecord): TaskMutationInput {
  return {
    title: task.title,
    summary: task.summary ?? null,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    kind: task.kind,
    owner: task.owner ?? null,
    ownerUserId: task.ownerUserId ?? null,
    team: task.team ?? null,
    startDate: task.startDate ?? null,
    dueDate: task.dueDate ?? null,
    isMilestone: task.isMilestone,
    progress: task.progress,
    effortPoints: task.effortPoints ?? null,
    tags: task.tags,
    internalNotes: task.internalNotes ?? null,
  };
}

function buildChecklistDraft(
  task: TaskRecord,
  item?: TaskChecklistItem | null,
): TaskChecklistItemMutationInput {
  return {
    label: item?.label ?? "",
    done: item?.done ?? false,
    owner: item?.owner ?? task.owner ?? null,
    ownerUserId: item?.ownerUserId ?? task.ownerUserId ?? null,
    dueDate: item?.dueDate ?? task.dueDate ?? null,
    notes: item?.notes ?? null,
  };
}

function buildSubtaskDraft(task: TaskRecord, item?: TaskSubtask | null): TaskSubtaskMutationInput {
  return {
    title: item?.title ?? "",
    status: item?.status ?? "Backlog",
    owner: item?.owner ?? task.owner ?? null,
    ownerUserId: item?.ownerUserId ?? task.ownerUserId ?? null,
    startDate: item?.startDate ?? task.startDate ?? null,
    dueDate: item?.dueDate ?? task.dueDate ?? null,
    description: item?.description ?? null,
  };
}

function normalizeDraft(input: TaskMutationInput): TaskMutationInput {
  const startDate = input.startDate?.trim() || null;
  const dueDate = input.dueDate?.trim() || null;
  const milestoneDate = dueDate || startDate || null;

  return {
    title: input.title.trim(),
    summary: input.summary?.trim() || null,
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    kind: input.kind,
    owner: input.owner?.trim() || null,
    ownerUserId: input.ownerUserId?.trim() || null,
    team: input.team?.trim() || null,
    startDate: input.isMilestone ? milestoneDate : startDate,
    dueDate: input.isMilestone ? milestoneDate : dueDate,
    isMilestone: input.isMilestone,
    progress: input.progress,
    effortPoints: input.effortPoints ?? null,
    tags: normalizeTags(input.tags),
    internalNotes: input.internalNotes?.trim() || null,
  };
}

function draftsAreEqual(left: TaskMutationInput | null, right: TaskMutationInput | null) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return JSON.stringify(normalizeDraft(left)) === JSON.stringify(normalizeDraft(right));
}

export function TasksDetailEngineClientPage() {
  const params = useParams<{ id?: string }>();
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const id = params?.id ? String(params.id) : "";

  const canRead = hasModulePermission(tasksDetailModuleDefinition, "canRead", permissions);
  const canUpdate = canUseModuleAction(tasksDetailModuleDefinition, "edit", permissions);
  const canDelete = canUseModuleAction(tasksDetailModuleDefinition, "delete", permissions);
  const canAudit = canUseModuleAction(tasksDetailModuleDefinition, "audit", permissions);
  const { users: mentionableUsers } = useMentionableUsers("tasks.read");

  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const [task, setTask] = React.useState<TaskRecord | null>(null);
  const [draft, setDraft] = React.useState<TaskMutationInput | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [assignableUsers, setAssignableUsers] = React.useState<TaskAssignableUser[]>([]);
  const [assignableUsersLoading, setAssignableUsersLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);

  const [commentDraft, setCommentDraft] =
    React.useState<TaskCommentMutationInput>(EMPTY_COMMENT_DRAFT);
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null);

  const [editingChecklistItem, setEditingChecklistItem] = React.useState<TaskChecklistItem | null>(null);
  const [checklistDraft, setChecklistDraft] = React.useState<TaskChecklistItemMutationInput | null>(null);
  const [checklistDialogOpen, setChecklistDialogOpen] = React.useState(false);
  const [checklistSaving, setChecklistSaving] = React.useState(false);
  const [checklistDeleting, setChecklistDeleting] = React.useState(false);

  const [editingSubtask, setEditingSubtask] = React.useState<TaskSubtask | null>(null);
  const [subtaskDraft, setSubtaskDraft] = React.useState<TaskSubtaskMutationInput | null>(null);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = React.useState(false);
  const [subtaskSaving, setSubtaskSaving] = React.useState(false);
  const [subtaskDeleting, setSubtaskDeleting] = React.useState(false);

  const [dependencyDialogOpen, setDependencyDialogOpen] = React.useState(false);
  const [dependencyQuery, setDependencyQuery] = React.useState("");
  const [dependencyOptions, setDependencyOptions] = React.useState<TaskRecord[]>([]);
  const [dependencyLoading, setDependencyLoading] = React.useState(false);
  const [dependencyBusy, setDependencyBusy] = React.useState(false);
  const [selectedDependencyTaskId, setSelectedDependencyTaskId] = React.useState<string | null>(null);

  const setChecklistDraftValue = React.useCallback<
    React.Dispatch<React.SetStateAction<TaskChecklistItemMutationInput>>
  >((next) => {
    setChecklistDraft((previous) => {
      if (!previous) {
        return previous;
      }

      return typeof next === "function"
        ? (next as (prevState: TaskChecklistItemMutationInput) => TaskChecklistItemMutationInput)(
            previous,
          )
        : next;
    });
  }, []);

  const setSubtaskDraftValue = React.useCallback<
    React.Dispatch<React.SetStateAction<TaskSubtaskMutationInput>>
  >((next) => {
    setSubtaskDraft((previous) => {
      if (!previous) {
        return previous;
      }

      return typeof next === "function"
        ? (next as (prevState: TaskSubtaskMutationInput) => TaskSubtaskMutationInput)(previous)
        : next;
    });
  }, []);

  const setDraftValue = React.useCallback<React.Dispatch<React.SetStateAction<TaskMutationInput>>>(
    (next) => {
      setDraft((previous) => {
        if (!previous) {
          return previous;
        }

        return typeof next === "function"
          ? (next as (prevState: TaskMutationInput) => TaskMutationInput)(previous)
          : next;
      });
    },
    [],
  );

  const refreshFromTask = React.useCallback(
    (updated: TaskRecord, replaceSavedDraft: (nextDraft: TaskMutationInput | null) => void) => {
      setTask(updated);
      const nextDraft = buildDraft(updated);
      setDraft(nextDraft);
      replaceSavedDraft(nextDraft);
    },
    [],
  );

  const persistTaskDraft = React.useCallback(
    async (nextDraft: TaskMutationInput) => {
      if (!task) {
        return nextDraft;
      }

      const normalizedDraft = normalizeDraft(nextDraft);
      if (!normalizedDraft.title.trim()) {
        throw new Error("Informe um titulo para a tarefa.");
      }

      const updated = await dataProvider.update<TaskRecord>(
        tasksDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "tasks.detail",
        task.id,
        normalizedDraft,
      );
      const savedDraft = buildDraft(updated);
      setTask(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [dataProvider, task],
  );

  const autoSave = useDetailAutoSaveController<TaskMutationInput>({
    draft,
    enabled: Boolean(task) && canUpdate,
    config: getModuleDetailEditingConfig(tasksDetailModuleDefinition),
    normalizeDraft,
    areEqual: draftsAreEqual,
    onSave: persistTaskDraft,
    onError: (nextError) => {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao salvar tarefa.";
      setError(message);
    },
  });

  const { saving: autoSaving, replaceSavedDraft, commitDraft, commitField } = autoSave;
  const saving = busy || autoSaving;

  const loadTask = React.useCallback(async () => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }

    if (!token || !canRead || !id) {
      setTask(null);
      setDraft(null);
      setAssignableUsers([]);
      setAssignableUsersLoading(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setAssignableUsersLoading(canUpdate);
      const [response, users] = await Promise.all([
        dataProvider.read<TaskRecord>(
          tasksDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "tasks.detail",
          id,
        ),
        canUpdate ? listTaskAssignableUsersRemote(token) : Promise.resolve([]),
      ]);
      setTask(response);
      setAssignableUsers(users);
      const nextDraft = buildDraft(response);
      setDraft(nextDraft);
      replaceSavedDraft(nextDraft);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar tarefa.";
      setTask(null);
      setDraft(null);
      setAssignableUsers([]);
      setError(message);
    } finally {
      setAssignableUsersLoading(false);
      setLoading(false);
    }
  }, [
    authLoading,
    canRead,
    canUpdate,
    dataProvider,
    id,
    replaceSavedDraft,
    token,
    userLoading,
  ]);

  React.useEffect(() => {
    void loadTask();
  }, [loadTask]);

  React.useEffect(() => {
    setAuditVisibleCount(24);
    setCommentDraft(EMPTY_COMMENT_DRAFT);
  }, [id]);

  React.useEffect(() => {
    if (!dependencyDialogOpen || !token || !task) {
      setDependencyOptions([]);
      setSelectedDependencyTaskId(null);
      return;
    }

    let cancelled = false;
    setDependencyLoading(true);

    void searchTasks(token, {
      searchText: dependencyQuery,
      domain: null,
      groupBy: [],
      all: true,
    })
      .then((response) => {
        if (cancelled) return;
        const excludedIds = new Set([
          task.id,
          ...task.dependencies.map((entry) => entry.taskId),
        ]);
        const filtered = response.data.filter((entry) => !excludedIds.has(entry.id));
        setDependencyOptions(filtered);
        setSelectedDependencyTaskId((previous) =>
          previous && filtered.some((entry) => entry.id === previous)
            ? previous
            : filtered[0]?.id ?? null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setDependencyOptions([]);
          setSelectedDependencyTaskId(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDependencyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dependencyDialogOpen, dependencyQuery, task, token]);

  const backToList = React.useCallback(() => {
    router.push(withTenantPath(TASKS_ROUTES.list, tenantSlug));
  }, [router, tenantSlug]);

  const handleDelete = React.useCallback(async () => {
    if (!task) return;
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;

    setBusy(true);
    setError(null);

    try {
      await dataProvider.delete(
        tasksDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "tasks.detail",
        task.id,
      );
      backToList();
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao excluir tarefa.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [backToList, dataProvider, task]);

  const handleNotesBlur = React.useCallback(() => {
    void commitDraft();
  }, [commitDraft]);

  const openChecklistDialog = React.useCallback(
    (item?: TaskChecklistItem | null) => {
      if (!task || !canUpdate) return;
      setEditingChecklistItem(item ?? null);
      setChecklistDraft(buildChecklistDraft(task, item));
      setChecklistDialogOpen(true);
    },
    [canUpdate, task],
  );

  const openSubtaskDialog = React.useCallback(
    (item?: TaskSubtask | null) => {
      if (!task || !canUpdate) return;
      setEditingSubtask(item ?? null);
      setSubtaskDraft(buildSubtaskDraft(task, item));
      setSubtaskDialogOpen(true);
    },
    [canUpdate, task],
  );

  const handleToggleChecklistItem = React.useCallback(
    async (item: TaskChecklistItem) => {
      if (!token || !task) return;
      const updated = await toggleTaskChecklistItemRemote(token, task.id, item.id);
      refreshFromTask(updated, replaceSavedDraft);
    },
    [refreshFromTask, replaceSavedDraft, task, token],
  );

  const handleSaveChecklistItem = React.useCallback(async () => {
    if (!token || !task || !checklistDraft) return;
    setChecklistSaving(true);
    setError(null);
    try {
      const updated = editingChecklistItem
        ? await updateTaskChecklistItemRemote(token, task.id, editingChecklistItem.id, checklistDraft)
        : await addTaskChecklistItemRemote(token, task.id, checklistDraft);
      refreshFromTask(updated, replaceSavedDraft);
      setChecklistDialogOpen(false);
      setEditingChecklistItem(null);
      setChecklistDraft(null);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao salvar item do checklist.";
      setError(message);
    } finally {
      setChecklistSaving(false);
    }
  }, [checklistDraft, editingChecklistItem, refreshFromTask, replaceSavedDraft, task, token]);

  const handleDeleteChecklistItem = React.useCallback(async () => {
    if (!token || !task || !editingChecklistItem) return;
    if (!window.confirm(`Excluir o item "${editingChecklistItem.label}"?`)) return;
    setChecklistDeleting(true);
    setError(null);
    try {
      const updated = await deleteTaskChecklistItemRemote(token, task.id, editingChecklistItem.id);
      refreshFromTask(updated, replaceSavedDraft);
      setChecklistDialogOpen(false);
      setEditingChecklistItem(null);
      setChecklistDraft(null);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao excluir item do checklist.";
      setError(message);
    } finally {
      setChecklistDeleting(false);
    }
  }, [editingChecklistItem, refreshFromTask, replaceSavedDraft, task, token]);

  const handleToggleSubtaskStatus = React.useCallback(
    async (item: TaskSubtask) => {
      if (!token || !task) return;
      const updated = await toggleTaskSubtaskStatusRemote(token, task.id, item.id);
      refreshFromTask(updated, replaceSavedDraft);
    },
    [refreshFromTask, replaceSavedDraft, task, token],
  );

  const handleSaveSubtask = React.useCallback(async () => {
    if (!token || !task || !subtaskDraft) return;
    setSubtaskSaving(true);
    setError(null);
    try {
      const updated = editingSubtask
        ? await updateTaskSubtaskRemote(token, task.id, editingSubtask.id, subtaskDraft)
        : await addTaskSubtaskRemote(token, task.id, subtaskDraft);
      refreshFromTask(updated, replaceSavedDraft);
      setSubtaskDialogOpen(false);
      setEditingSubtask(null);
      setSubtaskDraft(null);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao salvar subtarefa.";
      setError(message);
    } finally {
      setSubtaskSaving(false);
    }
  }, [editingSubtask, refreshFromTask, replaceSavedDraft, subtaskDraft, task, token]);

  const handleDeleteSubtask = React.useCallback(async () => {
    if (!token || !task || !editingSubtask) return;
    if (!window.confirm(`Excluir a subtarefa "${editingSubtask.title}"?`)) return;
    setSubtaskDeleting(true);
    setError(null);
    try {
      const updated = await deleteTaskSubtaskRemote(token, task.id, editingSubtask.id);
      refreshFromTask(updated, replaceSavedDraft);
      setSubtaskDialogOpen(false);
      setEditingSubtask(null);
      setSubtaskDraft(null);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao excluir subtarefa.";
      setError(message);
    } finally {
      setSubtaskDeleting(false);
    }
  }, [editingSubtask, refreshFromTask, replaceSavedDraft, task, token]);

  const handleSubmitComment = React.useCallback(async () => {
    if (!token || !task || !commentDraft.body.trim()) return;
    setCommentSubmitting(true);
    setError(null);
    try {
      const updated = await addTaskCommentRemote(token, task.id, commentDraft);
      refreshFromTask(updated, replaceSavedDraft);
      setCommentDraft(EMPTY_COMMENT_DRAFT);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao comentar na tarefa.";
      setError(message);
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft, refreshFromTask, replaceSavedDraft, task, token]);

  const handleDeleteComment = React.useCallback(
    async (comment: TaskComment) => {
      if (!token || !task) return;
      if (!window.confirm("Excluir este comentario?")) return;
      setCommentSubmitting(true);
      setError(null);
      try {
        const updated = await deleteTaskCommentRemote(token, task.id, comment.id);
        refreshFromTask(updated, replaceSavedDraft);
      } catch (nextError) {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao excluir comentario.";
        setError(message);
      } finally {
        setCommentSubmitting(false);
      }
    },
    [refreshFromTask, replaceSavedDraft, task, token],
  );

  const handleSelectAttachment = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !token || !task) {
        resumeDetailAutoSave();
        return;
      }

      setAttachmentUploading(true);
      setError(null);
      try {
        const uploaded = await uploadTaskAttachment(token, file);
        const updated = await addTaskAttachmentRemote(token, task.id, {
          label: uploaded.originalName?.trim() || file.name.trim() || "Anexo",
          filePath: uploaded.path,
          mimeType: uploaded.mimeType ?? file.type ?? null,
          fileSizeBytes: uploaded.size ?? file.size,
        });
        refreshFromTask(updated, replaceSavedDraft);
      } catch (nextError) {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao enviar anexo.";
        setError(message);
      } finally {
        setAttachmentUploading(false);
        resumeDetailAutoSave();
      }
    },
    [refreshFromTask, replaceSavedDraft, task, token],
  );

  const handleDeleteAttachment = React.useCallback(
    async (attachment: TaskAttachment) => {
      if (!token || !task) return;
      if (!window.confirm(`Excluir o anexo "${attachment.label}"?`)) return;

      setAttachmentUploading(true);
      setError(null);
      try {
        const updated = await deleteTaskAttachmentRemote(token, task.id, attachment.id);
        refreshFromTask(updated, replaceSavedDraft);
      } catch (nextError) {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao excluir anexo.";
        setError(message);
      } finally {
        setAttachmentUploading(false);
      }
    },
    [refreshFromTask, replaceSavedDraft, task, token],
  );

  const handleSaveDependency = React.useCallback(async () => {
    if (!token || !task || !selectedDependencyTaskId) return;
    setDependencyBusy(true);
    setError(null);
    try {
      const updated = await addTaskDependencyRemote(token, task.id, selectedDependencyTaskId);
      refreshFromTask(updated, replaceSavedDraft);
      setDependencyDialogOpen(false);
      setDependencyQuery("");
      setSelectedDependencyTaskId(null);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao adicionar dependencia.";
      setError(message);
    } finally {
      setDependencyBusy(false);
    }
  }, [refreshFromTask, replaceSavedDraft, selectedDependencyTaskId, task, token]);

  const handleRemoveDependency = React.useCallback(
    async (dependency: TaskDependency) => {
      if (!token || !task) return;
      if (!window.confirm(`Remover a dependencia com "${dependency.title}"?`)) return;
      setDependencyBusy(true);
      setError(null);
      try {
        const updated = await deleteTaskDependencyRemote(token, task.id, dependency.id);
        refreshFromTask(updated, replaceSavedDraft);
      } catch (nextError) {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao remover dependencia.";
        setError(message);
      } finally {
        setDependencyBusy(false);
      }
    },
    [refreshFromTask, replaceSavedDraft, task, token],
  );

  const context = React.useMemo<TasksDetailLayoutContext | null>(
    () =>
      task && draft
        ? {
            task,
            draft,
            assignableUsers,
            mentionableUsers,
            assignableUsersLoading,
            onDraftChange: setDraftValue,
            onCommitField: commitField,
            onCommitDraft: commitDraft,
            onNotesChange: (next) =>
              setDraft((previous) =>
                previous ? { ...previous, internalNotes: next } : previous,
              ),
            onNotesBlur: handleNotesBlur,
            onAddChecklistItem: () => openChecklistDialog(null),
            onToggleChecklistItem: (item) => {
              void handleToggleChecklistItem(item);
            },
            onEditChecklistItem: (item) => openChecklistDialog(item),
            onAddSubtask: () => openSubtaskDialog(null),
            onToggleSubtaskStatus: (item) => {
              void handleToggleSubtaskStatus(item);
            },
            onEditSubtask: (item) => openSubtaskDialog(item),
            commentDraft,
            onCommentDraftChange: setCommentDraft,
            onSubmitComment: () => {
              void handleSubmitComment();
            },
            onDeleteComment: (comment) => {
              void handleDeleteComment(comment);
            },
            commentSubmitting,
            onUploadAttachment: () => {
              if (canUpdate) {
                suspendDetailAutoSave();
                attachmentInputRef.current?.click();
              }
            },
            onDeleteAttachment: (attachment) => {
              if (canUpdate) {
                void handleDeleteAttachment(attachment);
              }
            },
            attachmentUploading,
            onOpenDependencyCreate: () => {
              if (canUpdate) {
                setDependencyDialogOpen(true);
              }
            },
            onRemoveDependency: (dependency) => {
              if (canUpdate) {
                void handleRemoveDependency(dependency);
              }
            },
            auditVisibleCount,
            onAuditVisibleCountChange: setAuditVisibleCount,
            canAudit,
            canEdit: canUpdate,
          }
        : null,
    [
      assignableUsers,
      assignableUsersLoading,
      attachmentUploading,
      auditVisibleCount,
      canAudit,
      canUpdate,
      commentDraft,
      commentSubmitting,
      commitDraft,
      commitField,
      draft,
      handleDeleteComment,
      handleDeleteAttachment,
      handleNotesBlur,
      handleRemoveDependency,
      handleSubmitComment,
      handleToggleChecklistItem,
      handleToggleSubtaskStatus,
      mentionableUsers,
      openChecklistDialog,
      openSubtaskDialog,
      setDraftValue,
      task,
    ],
  );

  if (authLoading || userLoading || loading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando tarefa...</div>;
  }

  if (!canRead) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Voce nao tem permissao para acessar esta area.
      </div>
    );
  }

  if (error && !task) {
    return <div className="px-4 py-6 text-sm text-destructive">{error}</div>;
  }

  if (!task || !draft || !context) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Tarefa nao encontrada.</div>;
  }

  return (
    <>
      {error ? <div className="px-4 pt-4 text-sm text-destructive">{error}</div> : null}

      <input
        ref={attachmentInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
        className="hidden"
        onChange={(event) => {
          void handleSelectAttachment(event);
        }}
      />

      <DetailShellEngine<TasksDetailLayoutContext>
        moduleDefinition={tasksDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={canAudit}
        mode="edit"
        headerTitle={task.title}
        saving={saving}
        loading={loading}
        readOnly={!canUpdate}
        onClose={backToList}
        breadcrumbTitle={task.title}
        breadcrumbItems={[
          { label: "Tarefas", href: TASKS_ROUTES.list },
          { label: task.title },
        ]}
        headerActionsSlot={
          <div className="flex flex-wrap items-center gap-2">
            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={saving}
              >
                Excluir
              </Button>
            ) : null}
          </div>
        }
      />

      <DetailRelationItemDialog
        open={checklistDialogOpen}
        onOpenChange={(open) => {
          setChecklistDialogOpen(open);
          if (!open) {
            setEditingChecklistItem(null);
            setChecklistDraft(null);
          }
        }}
        title={editingChecklistItem ? "Administrar item do checklist" : "Novo item do checklist"}
        description="Edite prazo, responsavel e detalhes operacionais."
        onSave={() => void handleSaveChecklistItem()}
        onDelete={editingChecklistItem ? () => void handleDeleteChecklistItem() : undefined}
        saving={checklistSaving}
        deleting={checklistDeleting}
        disableSave={!checklistDraft?.label.trim()}
      >
        {checklistDraft ? (
          <TaskChecklistItemForm
            value={checklistDraft}
            onChange={setChecklistDraftValue}
            assignableUsers={assignableUsers}
            assignableUsersLoading={assignableUsersLoading}
          />
        ) : null}
      </DetailRelationItemDialog>

      <DetailRelationItemDialog
        open={subtaskDialogOpen}
        onOpenChange={(open) => {
          setSubtaskDialogOpen(open);
          if (!open) {
            setEditingSubtask(null);
            setSubtaskDraft(null);
          }
        }}
        title={editingSubtask ? "Administrar subtarefa" : "Nova subtarefa"}
        description="A subtarefa tem sua propria administracao dentro da tarefa principal."
        onSave={() => void handleSaveSubtask()}
        onDelete={editingSubtask ? () => void handleDeleteSubtask() : undefined}
        saving={subtaskSaving}
        deleting={subtaskDeleting}
        disableSave={!subtaskDraft?.title.trim()}
      >
        {subtaskDraft ? (
          <TaskSubtaskForm
            value={subtaskDraft}
            onChange={setSubtaskDraftValue}
            assignableUsers={assignableUsers}
            assignableUsersLoading={assignableUsersLoading}
            parentRange={{
              startDate: task.startDate ?? null,
              dueDate: task.dueDate ?? null,
            }}
          />
        ) : null}
      </DetailRelationItemDialog>

      <DetailRelationItemDialog
        open={dependencyDialogOpen}
        onOpenChange={(open) => {
          setDependencyDialogOpen(open);
          if (!open) {
            setDependencyQuery("");
            setSelectedDependencyTaskId(null);
          }
        }}
        title="Nova dependencia"
        description="Selecione a tarefa que precisa ser concluida antes desta."
        onSave={() => void handleSaveDependency()}
        saving={dependencyBusy}
        disableSave={!selectedDependencyTaskId}
      >
        <div className="space-y-4">
          <Input
            value={dependencyQuery}
            onChange={(event) => setDependencyQuery(event.target.value)}
            placeholder="Pesquisar tarefa vinculada"
            className="h-10 rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <div className="max-h-[18rem] space-y-2 overflow-y-auto">
            {dependencyLoading ? (
              <div className="text-sm text-muted-foreground">Carregando tarefas...</div>
            ) : dependencyOptions.length ? (
              dependencyOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "w-full rounded-none border px-3 py-3 text-left",
                    selectedDependencyTaskId === option.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/60 bg-background",
                  )}
                  onClick={() => setSelectedDependencyTaskId(option.id)}
                >
                  <div className="text-sm font-medium text-foreground">{option.title}</div>
                  <div className="pt-1 text-[12px] text-muted-foreground">
                    {option.status} • {option.owner ?? "Sem responsavel"} •{" "}
                    {option.dueDate ?? "Sem prazo"}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Nenhuma tarefa encontrada para vincular.
              </div>
            )}
          </div>
        </div>
      </DetailRelationItemDialog>
    </>
  );
}
