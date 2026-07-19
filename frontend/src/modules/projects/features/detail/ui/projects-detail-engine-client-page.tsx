"use client";

import * as React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/confirm/use-confirm";
import { useAuth } from "@/features/auth/auth-context";
import { useMentionableUsers } from "@/features/auth/use-mentionable-users";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { uploadProjectAttachment } from "@/features/uploads/api";
import { toDateInputValue } from "@/lib/date";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  addProjectAttachment,
  addProjectComment,
  createProjectPeopleGroup,
  deleteProjectAttachment,
  deleteProjectComment,
  deleteProjectEnrollment,
  listProjectEnrollments,
  listProjectGroups,
  listProjectPeopleGroups,
  type ApiProject,
  type ApiProjectEnrollment,
  type ApiProjectGroup,
  type ApiProjectPeopleGroup,
} from "@/modules/projects/api";
import { BulkEnrollmentDialog } from "@/modules/projects/features/detail/ui/bulk-enrollment-dialog";
import { ProjectPeopleGroupPickerDialog } from "@/modules/projects/features/detail/ui/project-people-group-picker-dialog";
import { ProjectEnrollmentManageDialog } from "@/modules/projects/features/detail/ui/project-enrollment-manage-dialog";
import { listPrograms, type ApiProgram } from "@/modules/programs/api";
import {
  type ProjectDetailDraft,
  type ProjectsDetailLayoutContext,
} from "@/modules/projects/config/projects-detail-layout-contract";
import {
  projectsDetailModuleDefinition,
  PROJECTS_ROUTES,
} from "@/modules/projects/config/projects-module-contract";
import { PROJECT_GROUPS_ROUTES } from "@/modules/projects/config/project-groups-module-contract";
import { listProjectActions, type ApiProjectAction } from "@/modules/actions/api";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import {
  resumeDetailAutoSave,
  suspendDetailAutoSave,
} from "@/web-client/detail/detail-media-autosave-guard";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import {
  canUseModuleAction,
  getModuleDetailEditingConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";

function buildDraft(project?: ApiProject | null, defaults?: { programId?: string }): ProjectDetailDraft {
  return {
    programId: project?.programId ?? defaults?.programId ?? "",
    name: project?.name ?? "",
    status: project?.status ?? "PLANNED",
    startsAt: toDateInputValue(project?.startsAt),
    endsAt: toDateInputValue(project?.endsAt),
    description: project?.description ?? "",
    tags: project?.tags ?? [],
    internalNotes: project?.internalNotes ?? null,
  };
}

const EMPTY_COMMENT_DRAFT = {
  body: "",
  mentionUserIds: [] as string[],
};

function normalizeDraft(draft: ProjectDetailDraft): ProjectDetailDraft {
  return {
    programId: draft.programId,
    name: draft.name.trim(),
    status: draft.status,
    startsAt: draft.startsAt || "",
    endsAt: draft.endsAt || "",
    description: draft.description.trim(),
    tags: Array.from(new Set((draft.tags ?? []).map((tag) => tag.trim()).filter(Boolean))),
    internalNotes: draft.internalNotes?.trim() ? draft.internalNotes.trim() : null,
  };
}

export function ProjectsDetailEngineClientPage() {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname) ?? "";

  const id = params?.id ? String(params.id) : "";
  const mode = id === "new" || pathname.endsWith("/projects/new") ? "create" : "edit";
  const isEdit = mode === "edit";
  const initialProgramId = searchParams.get("programId") ?? "";
  const returnTo = searchParams.get("returnTo");
  const requestedEnrollmentId = searchParams.get("enrollmentId");

  const canRead = hasModulePermission(projectsDetailModuleDefinition, "canRead", permissions);
  const canCreate = canUseModuleAction(projectsDetailModuleDefinition, "create", permissions);
  const canEdit = canUseModuleAction(projectsDetailModuleDefinition, "edit", permissions);
  const canAudit = canUseModuleAction(projectsDetailModuleDefinition, "audit", permissions);
  const { users: mentionableUsers } = useMentionableUsers("projects.read");
  const canManageStructure = permissions.includes("project-structure.update") || permissions.includes("project-structure.create");
  const canManageActions = permissions.includes("actions.create") || permissions.includes("actions.update");
  const canManageEnrollments =
    permissions.includes("enrollments.create") || permissions.includes("enrollments.update");
  const canDeleteEnrollments = permissions.includes("enrollments.delete");

  const canAccessPage = mode === "create" ? canCreate : canRead;
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const [project, setProject] = React.useState<ApiProject | null>(null);
  const [draft, setDraft] = React.useState<ProjectDetailDraft>(() =>
    buildDraft(null, { programId: initialProgramId }),
  );
  const [programOptions, setProgramOptions] = React.useState<ApiProgram[]>([]);
  const [peopleGroupRows, setPeopleGroupRows] = React.useState<ApiProjectPeopleGroup[]>([]);
  const [groupRows, setGroupRows] = React.useState<ApiProjectGroup[]>([]);
  const [enrollmentRows, setEnrollmentRows] = React.useState<ApiProjectEnrollment[]>([]);
  const [actionRows, setActionRows] = React.useState<ApiProjectAction[]>([]);
  const [loading, setLoading] = React.useState(isEdit);
  const [relationsLoading, setRelationsLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState(EMPTY_COMMENT_DRAFT);
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null);
  const [participantPickerOpen, setParticipantPickerOpen] = React.useState(false);
  const [editingEnrollment, setEditingEnrollment] =
    React.useState<ApiProjectEnrollment | null>(null);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = React.useState(false);
  const [peopleGroupPickerPurpose, setPeopleGroupPickerPurpose] = React.useState<
    "PUBLICO" | "EQUIPE" | null
  >(null);

  const buildProjectDetailHref = React.useCallback(
    (options?: { enrollmentId?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (options?.enrollmentId === null) {
        params.delete("enrollmentId");
      } else if (typeof options?.enrollmentId === "string" && options.enrollmentId.trim()) {
        params.set("enrollmentId", options.enrollmentId);
      }

      const query = params.toString();
      return withTenantPath(
        `${PROJECTS_ROUTES.detail}/${id}${query ? `?${query}` : ""}`,
        tenantSlug,
      );
    },
    [id, searchParams, tenantSlug],
  );

  const loadRelations = React.useCallback(async () => {
    if (!token || !isEdit || !id || !canRead) {
      setPeopleGroupRows([]);
      setGroupRows([]);
      setEnrollmentRows([]);
      setActionRows([]);
      return;
    }

      setRelationsLoading(true);
    try {
      const [peopleGroups, groups, enrollments, actions] = await Promise.all([
        listProjectPeopleGroups(token, id),
        listProjectGroups(token, id),
        listProjectEnrollments(token, id, { page: 1, limit: 200 }),
        listProjectActions(token, id, { page: 1, limit: 200 }),
      ]);
      setPeopleGroupRows(peopleGroups ?? []);
      setGroupRows(groups ?? []);
      setEnrollmentRows(enrollments.data ?? []);
      setActionRows(actions.data ?? []);
    } catch {
      setPeopleGroupRows([]);
      setGroupRows([]);
      setEnrollmentRows([]);
      setActionRows([]);
    } finally {
      setRelationsLoading(false);
    }
  }, [canRead, id, isEdit, token]);

  const persistDraft = React.useCallback(
    async (nextDraft: ProjectDetailDraft) => {
      const normalized = normalizeDraft(nextDraft);
      const updated = await dataProvider.update<ApiProject>(
        projectsDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "projects.detail",
        id,
        {
          ...normalized,
          startsAt: normalized.startsAt || null,
          endsAt: normalized.endsAt || null,
          description: normalized.description || null,
          tags: normalized.tags ?? [],
          internalNotes: normalized.internalNotes,
        },
      );
      const savedDraft = buildDraft(updated);
      setProject(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [dataProvider, id],
  );

  const autoSave = useDetailAutoSaveController<ProjectDetailDraft>({
    draft,
    enabled: isEdit && canEdit,
    config: getModuleDetailEditingConfig(projectsDetailModuleDefinition),
    normalizeDraft,
    onSave: persistDraft,
    onError: (error) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao salvar projeto.";
      toast({ variant: "destructive", title: "Falha ao salvar", description: message });
    },
  });
  const { saving: autoSaving, replaceSavedDraft, commitField } = autoSave;
  const saving = busy || autoSaving;

  React.useEffect(() => {
    setAuditVisibleCount(24);
    setCommentDraft(EMPTY_COMMENT_DRAFT);
  }, [id, mode]);

  React.useEffect(() => {
    if (!token || !canAccessPage) {
      setProgramOptions([]);
      return;
    }

    listPrograms(token, { all: true, limit: 200 })
      .then((response) => setProgramOptions(response.data ?? []))
      .catch(() => setProgramOptions([]));
  }, [canAccessPage, token]);

  React.useEffect(() => {
    if (!token || !canAccessPage || !isEdit || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    dataProvider
      .read<ApiProject>("projects.detail", id)
      .then((loaded) => {
        const nextDraft = buildDraft(loaded);
        setProject(loaded);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      })
      .catch((error) => {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao carregar projeto.";
        toast({ variant: "destructive", title: "Falha ao carregar", description: message });
      })
      .finally(() => setLoading(false));
  }, [canAccessPage, dataProvider, id, isEdit, replaceSavedDraft, toast, token]);

  React.useEffect(() => {
    void loadRelations();
  }, [loadRelations]);

  React.useEffect(() => {
    if (!isEdit) {
      setEditingEnrollment(null);
      setEnrollmentDialogOpen(false);
      return;
    }

    if (!requestedEnrollmentId) {
      setEditingEnrollment(null);
      setEnrollmentDialogOpen(false);
      return;
    }

    if (relationsLoading) {
      return;
    }

    const target =
      enrollmentRows.find((row) => row.id === requestedEnrollmentId) ?? null;

    if (!target) {
      setEditingEnrollment(null);
      setEnrollmentDialogOpen(false);
      router.replace(buildProjectDetailHref({ enrollmentId: null }));
      return;
    }

    setEditingEnrollment(target);
    setEnrollmentDialogOpen(true);
  }, [
    buildProjectDetailHref,
    enrollmentRows,
    isEdit,
    relationsLoading,
    requestedEnrollmentId,
    router,
  ]);

  const handleCreate = React.useCallback(async () => {
    if (!canCreate) return;
    const normalized = normalizeDraft(draft);
    if (!normalized.programId || !normalized.name) {
      toast({
        variant: "destructive",
        title: "Dados inv\u00e1lidos",
        description: "Informe programa e nome do projeto.",
      });
      return;
    }

    setBusy(true);
    try {
      const created = await dataProvider.create<ApiProject>("projects.detail", {
        ...normalized,
        startsAt: normalized.startsAt || null,
        endsAt: normalized.endsAt || null,
        description: normalized.description || null,
        tags: normalized.tags ?? [],
        internalNotes: normalized.internalNotes,
      });
      toast({ variant: "success", title: "Projeto criado" });
      router.replace(withTenantPath(`${PROJECTS_ROUTES.detail}/${created.id}`, tenantSlug));
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao criar projeto.";
      toast({ variant: "destructive", title: "Falha ao criar", description: message });
    } finally {
      setBusy(false);
    }
  }, [canCreate, dataProvider, draft, router, tenantSlug, toast]);

  const handleSubmitComment = React.useCallback(async () => {
    if (!token || !id || !commentDraft.body.trim()) return;
    setCommentSubmitting(true);
    try {
      const updated = await addProjectComment(token, id, commentDraft);
      const nextDraft = buildDraft(updated);
      setProject(updated);
      setDraft(nextDraft);
      replaceSavedDraft(nextDraft);
      setCommentDraft(EMPTY_COMMENT_DRAFT);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao comentar no projeto.";
      toast({ variant: "destructive", title: "Falha ao comentar", description: message });
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft, id, replaceSavedDraft, toast, token]);

  const handleDeleteComment = React.useCallback(
    async (commentId: string) => {
      if (!token || !id) return;
      if (!window.confirm("Excluir este coment\u00e1rio?")) return;
      setCommentSubmitting(true);
      try {
        const updated = await deleteProjectComment(token, id, commentId);
        const nextDraft = buildDraft(updated);
        setProject(updated);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao excluir coment\u00e1rio.";
        toast({ variant: "destructive", title: "Falha ao excluir", description: message });
      } finally {
        setCommentSubmitting(false);
      }
    },
    [id, replaceSavedDraft, toast, token],
  );

  const handleSelectAttachment = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !token || !id) {
        resumeDetailAutoSave();
        return;
      }

      setAttachmentUploading(true);
      try {
        const uploaded = await uploadProjectAttachment(token, file);
        const updated = await addProjectAttachment(token, id, {
          label: uploaded.originalName?.trim() || file.name.trim() || "Anexo",
          filePath: uploaded.path,
          mimeType: uploaded.mimeType ?? file.type ?? null,
          fileSizeBytes: uploaded.size ?? file.size,
        });
        const nextDraft = buildDraft(updated);
        setProject(updated);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao enviar anexo.";
        toast({ variant: "destructive", title: "Falha ao enviar", description: message });
      } finally {
        setAttachmentUploading(false);
        resumeDetailAutoSave();
      }
    },
    [id, replaceSavedDraft, toast, token],
  );

  const handleDeleteAttachment = React.useCallback(
    async (attachmentId: string) => {
      if (!token || !id) return;
      if (!window.confirm("Excluir este anexo?")) return;
      setAttachmentUploading(true);
      try {
        const updated = await deleteProjectAttachment(token, id, attachmentId);
        const nextDraft = buildDraft(updated);
        setProject(updated);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao excluir anexo.";
        toast({ variant: "destructive", title: "Falha ao excluir", description: message });
      } finally {
        setAttachmentUploading(false);
      }
    },
    [id, replaceSavedDraft, toast, token],
  );

  const selectedProgram = React.useMemo(() => {
    const currentProgramId = draft.programId || project?.programId || "";
    return (
      programOptions.find((item) => item.id === currentProgramId) ??
      (project?.program ? ({ ...project.program } as ApiProgram) : null)
    );
  }, [draft.programId, programOptions, project?.program, project?.programId]);

  const closeHref = React.useMemo(() => {
    if (returnTo) return returnTo;
    return withTenantPath(PROJECTS_ROUTES.list, tenantSlug);
  }, [returnTo, tenantSlug]);

  const handleCreateEnrollment = React.useCallback(() => {
    setParticipantPickerOpen(true);
  }, []);

  const handleCreatePublicPeopleGroup = React.useCallback(() => {
    setPeopleGroupPickerPurpose("PUBLICO");
  }, []);

  const handleCreateTeamPeopleGroup = React.useCallback(() => {
    setPeopleGroupPickerPurpose("EQUIPE");
  }, []);

  const handlePickPeopleGroup = React.useCallback(
    async (peopleGroup: { id: string }) => {
      if (!token || !id || !peopleGroupPickerPurpose) return;
      try {
        await createProjectPeopleGroup(token, id, {
          peopleGroupId: peopleGroup.id,
          participationKind: peopleGroupPickerPurpose === "EQUIPE" ? "TEAM" : "PARTICIPANT",
        });
        toast({
          title:
            peopleGroupPickerPurpose === "EQUIPE"
              ? "Grupo de Equipe adicionado"
              : "Grupo de Pessoas adicionado",
        });
        setPeopleGroupPickerPurpose(null);
        await loadRelations();
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : peopleGroupPickerPurpose === "EQUIPE"
              ? "Falha ao adicionar grupo de equipe."
              : "Falha ao adicionar grupo de pessoas.";
        toast({ variant: "destructive", title: "Falha ao adicionar", description: message });
      }
    },
    [id, loadRelations, peopleGroupPickerPurpose, toast, token],
  );

  const publicPeopleGroupRows = React.useMemo(
    () => peopleGroupRows.filter((row) => row.participationKind === "PARTICIPANT"),
    [peopleGroupRows],
  );

  const teamPeopleGroupRows = React.useMemo(
    () => peopleGroupRows.filter((row) => row.participationKind === "TEAM"),
    [peopleGroupRows],
  );

  const handleEndEnrollment = React.useCallback(
    async (enrollment: ApiProjectEnrollment) => {
      if (!token || !id || !canDeleteEnrollments) return;
      const confirmed = await confirm({
        title: "Encerrar matr\u00edcula",
        description: `Encerrar a matr\u00edcula de "${enrollment.person.fullName}" preservando o hist\u00f3rico?`,
        confirmLabel: "Encerrar",
        cancelLabel: "Cancelar",
        confirmVariant: "destructive",
      });
      if (!confirmed) return;
      try {
        await deleteProjectEnrollment(token, id, enrollment.id);
        toast({ title: "Matr\u00edcula encerrada" });
        await loadRelations();
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao encerrar matr\u00edcula.";
        toast({ variant: "destructive", title: "Falha ao encerrar", description: message });
      }
    },
    [canDeleteEnrollments, confirm, id, loadRelations, toast, token],
  );

  const handleEnrollmentDialogChange = React.useCallback(
    (open: boolean) => {
      setEnrollmentDialogOpen(open);
      if (!open) {
        setEditingEnrollment(null);
        router.replace(buildProjectDetailHref({ enrollmentId: null }));
      }
    },
    [buildProjectDetailHref, router],
  );

  const context = React.useMemo<ProjectsDetailLayoutContext>(
    () => ({
      mode,
      readOnly: mode === "create" ? !canCreate : !canEdit,
      canAudit,
      canEdit,
      canManageStructure,
      canManageActions,
      canManageEnrollments,
      canDeleteEnrollments,
      tenantSlug,
      project,
      draft,
      setDraft,
      programOptions: programOptions.map((item) => ({
        value: item.id,
        label: item.name,
        type: item.type,
        status: item.status,
        })),
        selectedProgram,
        publicPeopleGroupRows,
        teamPeopleGroupRows,
        groupRows,
        enrollmentRows,
        actionRows,
      relationsLoading,
      mentionableUsers,
      commentDraft,
      commentSubmitting,
      attachmentUploading,
      onCommitField: (field, nextValue) => void commitField(field, nextValue),
      onCommentDraftChange: setCommentDraft,
      onSubmitComment: handleSubmitComment,
      onDeleteComment: handleDeleteComment,
      onUploadAttachment: () => {
        if (!canEdit || mode !== "edit") return;
        suspendDetailAutoSave();
        attachmentInputRef.current?.click();
      },
      onDeleteAttachment: handleDeleteAttachment,
      onNotesChange: (next) =>
        setDraft((previous) => ({ ...previous, internalNotes: next })),
      onNotesBlur: () => void commitField("internalNotes"),
      onOpenGroup: (groupId) =>
        router.push(
          withTenantPath(
            `/projects/${id}/groups?groupId=${encodeURIComponent(groupId)}&returnTo=${encodeURIComponent(pathname)}`,
            tenantSlug,
          ),
        ),
      onCreateGroup: () =>
        router.push(
          withTenantPath(
            `${PROJECT_GROUPS_ROUTES.list}/new?projectId=${encodeURIComponent(id)}&returnTo=${encodeURIComponent(pathname)}`,
            tenantSlug,
          ),
        ),
      onOpenPeopleGroup: (peopleGroupId) =>
        router.push(
          withTenantPath(
            `/people-groups/${encodeURIComponent(peopleGroupId)}?returnTo=${encodeURIComponent(pathname)}`,
            tenantSlug,
          ),
        ),
      onCreatePublicPeopleGroup: handleCreatePublicPeopleGroup,
      onCreateTeamPeopleGroup: handleCreateTeamPeopleGroup,
      onOpenEnrollment: (enrollmentId) =>
        router.push(buildProjectDetailHref({ enrollmentId })),
      onCreateEnrollment: handleCreateEnrollment,
      onEndEnrollment: handleEndEnrollment,
      onOpenAction: (actionId) =>
        router.push(
          withTenantPath(
            `/actions/${actionId}?projectId=${encodeURIComponent(id)}&returnTo=${encodeURIComponent(pathname)}`,
            tenantSlug,
          ),
        ),
      onCreateAction: () =>
        router.push(
          withTenantPath(
            `/actions/new?projectId=${encodeURIComponent(id)}&returnTo=${encodeURIComponent(pathname)}`,
            tenantSlug,
          ),
        ),
      auditVisibleCount,
      onAuditVisibleCountChange: setAuditVisibleCount,
    }),
    [
      actionRows,
      attachmentUploading,
      auditVisibleCount,
      canAudit,
      canCreate,
      canEdit,
      canManageActions,
      canDeleteEnrollments,
      canManageEnrollments,
      canManageStructure,
      commentDraft,
      commentSubmitting,
      commitField,
      draft,
      enrollmentRows,
      groupRows,
      id,
      mode,
      pathname,
      programOptions,
      project,
      relationsLoading,
      handleDeleteAttachment,
      handleDeleteComment,
      handleCreateEnrollment,
      handleCreatePublicPeopleGroup,
      handleCreateTeamPeopleGroup,
      buildProjectDetailHref,
      handleEndEnrollment,
      handleSubmitComment,
      mentionableUsers,
      publicPeopleGroupRows,
      router,
      selectedProgram,
      teamPeopleGroupRows,
      tenantSlug,
    ],
  );

  if (!canAccessPage) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Sem permiss\u00e3o.</div>;
  }

  const headerTitle =
    mode === "create" ? "Novo projeto" : project?.name || draft.name || "Projeto";

  return (
    <>
      <input
        ref={attachmentInputRef}
        type="file"
        className="hidden"
        onChange={handleSelectAttachment}
      />
      <DetailShellEngine<ProjectsDetailLayoutContext>
        moduleDefinition={projectsDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={canAudit}
        mode={mode}
        headerTitle={headerTitle}
        saving={saving || commentSubmitting || attachmentUploading}
        loading={loading}
        readOnly={context.readOnly}
        onSave={mode === "create" ? handleCreate : undefined}
        onClose={() => router.push(closeHref)}
        breadcrumbTitle={headerTitle}
        breadcrumbItems={[
          { label: "Projetos", href: PROJECTS_ROUTES.list },
          ...(mode === "edit" ? [{ label: headerTitle }] : []),
        ]}
      />
      {mode === "edit" && token ? (
        <BulkEnrollmentDialog
          open={participantPickerOpen}
          onOpenChange={setParticipantPickerOpen}
          token={token}
          projectId={id}
          canReadPeople={permissions.includes("people.read")}
          onCompleted={() => {
            void loadRelations();
          }}
        />
      ) : null}
      {mode === "edit" && token && editingEnrollment ? (
        <ProjectEnrollmentManageDialog
          open={enrollmentDialogOpen}
          onOpenChange={handleEnrollmentDialogChange}
          token={token}
          projectId={id}
          enrollment={editingEnrollment}
          onCompleted={loadRelations}
        />
      ) : null}
      {mode === "edit" && token && peopleGroupPickerPurpose ? (
        <ProjectPeopleGroupPickerDialog
          open={Boolean(peopleGroupPickerPurpose)}
          onOpenChange={(open) => {
            if (!open) setPeopleGroupPickerPurpose(null);
          }}
          token={token}
          purpose={peopleGroupPickerPurpose}
          onPick={handlePickPeopleGroup}
        />
      ) : null}
    </>
  );
}



