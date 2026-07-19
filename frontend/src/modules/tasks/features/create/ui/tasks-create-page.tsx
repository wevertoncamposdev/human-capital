"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useMentionableUsers } from "@/features/auth/use-mentionable-users";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  tasksDetailModuleDefinition,
  TASKS_ROUTES,
} from "@/modules/tasks/config/tasks-module-contract";
import type { TasksDetailLayoutContext } from "@/modules/tasks/config/tasks-detail-layout-contract";
import type {
  TaskAssignableUser,
  TaskMutationInput,
  TaskRecord,
} from "@/modules/tasks/shared/domain/types";
import { createRestDataProvider } from "@/web-client/data-provider";
import { normalizeTags } from "@/web-client/detail/tag-utils";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { listTaskAssignableUsersRemote } from "@/web-client/data-provider/rest/tasks";
import { canUseModuleAction } from "@/web-client/registry/module-utils";

const EMPTY_TASK_FORM: TaskMutationInput = {
  title: "",
  summary: null,
  description: null,
  status: "Backlog",
  priority: "Media",
  kind: "Feature",
  owner: null,
  ownerUserId: null,
  team: null,
  startDate: null,
  dueDate: null,
  isMilestone: false,
  progress: 0,
  effortPoints: null,
  tags: [],
  internalNotes: null,
};

function buildDraftTask(draft: TaskMutationInput): TaskRecord {
  return {
    id: "draft-task",
    title: draft.title || "Nova tarefa",
    summary: draft.summary ?? null,
    description: draft.description ?? null,
    status: draft.status,
    priority: draft.priority,
    kind: draft.kind,
    owner: draft.owner ?? null,
    ownerUserId: draft.ownerUserId ?? null,
    team: draft.team ?? null,
    startDate: draft.startDate ?? null,
    dueDate: draft.dueDate ?? null,
    isMilestone: draft.isMilestone,
    progress: draft.progress,
    effortPoints: draft.effortPoints ?? null,
    tags: draft.tags,
    internalNotes: draft.internalNotes ?? null,
    dueState: draft.dueDate ? "Planejada" : "Sem prazo",
    isOverdue: false,
    daysUntilDue: null,
    checklist: [],
    subtasks: [],
    comments: [],
    attachments: [],
    dependencies: [],
    dependents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function TasksCreatePage() {
  const { token, isLoading: authLoading } = useAuth();
  const { user, permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const canCreate = canUseModuleAction(
    tasksDetailModuleDefinition,
    "create",
    permissions,
  );
  const { users: mentionableUsers } = useMentionableUsers("tasks.read");

  const [draft, setDraft] = React.useState<TaskMutationInput>(EMPTY_TASK_FORM);
  const [assignableUsers, setAssignableUsers] = React.useState<TaskAssignableUser[]>([]);
  const [assignableUsersLoading, setAssignableUsersLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);

  React.useEffect(() => {
    if (!token || !canCreate) {
      setAssignableUsers([]);
      setAssignableUsersLoading(false);
      return;
    }

    let cancelled = false;
    setAssignableUsersLoading(true);
    void listTaskAssignableUsersRemote(token)
      .then((response) => {
        if (!cancelled) {
          setAssignableUsers(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssignableUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAssignableUsersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canCreate, token]);

  React.useEffect(() => {
    if (!user?.id || draft.ownerUserId) {
      return;
    }

    setDraft((previous) => ({
      ...previous,
      ownerUserId: user.id,
      owner: user.name ?? user.email ?? null,
    }));
  }, [draft.ownerUserId, user?.email, user?.id, user?.name]);

  const backToList = React.useCallback(() => {
    router.push(withTenantPath(TASKS_ROUTES.list, tenantSlug));
  }, [router, tenantSlug]);

  const handleSave = React.useCallback(async () => {
    if (!canCreate) {
      setError("Voce nao tem permissao para criar tarefas.");
      return;
    }

    if (!draft.title.trim()) {
      setError("Informe um titulo para a tarefa.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await dataProvider.create<TaskRecord>(
        tasksDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "tasks.detail",
        {
          ...draft,
          startDate:
            draft.isMilestone && (draft.dueDate || draft.startDate)
              ? draft.dueDate || draft.startDate
              : draft.startDate,
          dueDate:
            draft.isMilestone && (draft.dueDate || draft.startDate)
              ? draft.dueDate || draft.startDate
              : draft.dueDate,
          tags: normalizeTags(draft.tags),
        },
      );
      router.push(withTenantPath(`/tasks/${created.id}`, tenantSlug));
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao criar tarefa.";
      setError(message);
      setSaving(false);
      return;
    }

    setSaving(false);
  }, [canCreate, dataProvider, draft, router, tenantSlug]);

  const context = React.useMemo<TasksDetailLayoutContext>(
    () => ({
      task: buildDraftTask(draft),
      draft,
      assignableUsers,
      mentionableUsers,
      assignableUsersLoading,
      onDraftChange: setDraft,
      onCommitField: () => {},
      onCommitDraft: () => {},
      onNotesChange: (next) =>
        setDraft((previous) => ({ ...previous, internalNotes: next })),
      onNotesBlur: () => {},
      onAddChecklistItem: () => {},
      onToggleChecklistItem: () => {},
      onEditChecklistItem: () => {},
      onAddSubtask: () => {},
      onToggleSubtaskStatus: () => {},
      onEditSubtask: () => {},
      commentDraft: { body: "", mentionUserIds: [] },
      onCommentDraftChange: () => {},
      onSubmitComment: () => {},
      onDeleteComment: () => {},
      commentSubmitting: false,
      onUploadAttachment: () => {},
      onDeleteAttachment: () => {},
      attachmentUploading: false,
      onOpenDependencyCreate: () => {},
      onRemoveDependency: () => {},
      auditVisibleCount,
      onAuditVisibleCountChange: setAuditVisibleCount,
      canAudit: false,
      canEdit: true,
    }),
    [assignableUsers, assignableUsersLoading, auditVisibleCount, draft, mentionableUsers],
  );

  return (
    <>
      {authLoading || userLoading ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">Carregando tarefa...</div>
      ) : !canCreate ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          Voce nao tem permissao para criar tarefas.
        </div>
      ) : (
        <>
      {error ? <div className="px-4 pt-4 text-sm text-destructive">{error}</div> : null}

      <DetailShellEngine<TasksDetailLayoutContext>
        moduleDefinition={tasksDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={false}
        mode="create"
        headerTitle={draft.title || "Nova tarefa"}
        saving={saving}
        readOnly={false}
        onSave={() => void handleSave()}
        onClose={backToList}
        breadcrumbTitle="Nova tarefa"
        breadcrumbItems={[
          { label: "Tarefas", href: TASKS_ROUTES.list },
          { label: "Nova tarefa" },
        ]}
      />
        </>
      )}
    </>
  );
}
