"use client";

import * as React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRegisterUsageDocumentation } from "@/components/UsageDocumentation/UsageDocumentationProvider";
import { buildUsageDocumentationItems } from "@/components/UsageDocumentation/usage-documentation.helpers";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useMentionableUsers } from "@/features/auth/use-mentionable-users";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { uploadProgramAttachment } from "@/features/uploads/api";
import { toDateInputValue } from "@/lib/date";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { listProjects, type ApiProject } from "@/modules/projects/api";
import {
  addProgramAttachment,
  addProgramComment,
  deleteProgramAttachment,
  deleteProgramComment,
  type ApiProgram,
} from "@/modules/programs/api";
import {
  type ProgramDetailDraft,
  type ProgramsDetailLayoutContext,
} from "@/modules/programs/config/programs-detail-layout-contract";
import {
  programsDetailModuleDefinition,
  PROGRAMS_ROUTES,
} from "@/modules/programs/config/programs-module-contract";
import { PROGRAM_USAGE_TEXT } from "@/modules/programs/shared/domain/programs.constants";
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

function buildDraft(program?: ApiProgram | null): ProgramDetailDraft {
  return {
    name: program?.name ?? "",
    type: program?.type ?? "OTHER",
    status: program?.status ?? "PLANNED",
    startsAt: toDateInputValue(program?.startsAt),
    endsAt: toDateInputValue(program?.endsAt),
    description: program?.description ?? "",
    tags: program?.tags ?? [],
    internalNotes: program?.internalNotes ?? null,
  };
}

const EMPTY_COMMENT_DRAFT = {
  body: "",
  mentionUserIds: [] as string[],
};

function normalizeDraft(draft: ProgramDetailDraft): ProgramDetailDraft {
  return {
    name: draft.name.trim(),
    type: draft.type,
    status: draft.status,
    startsAt: draft.startsAt || "",
    endsAt: draft.endsAt || "",
    description: draft.description.trim(),
    tags: Array.from(new Set((draft.tags ?? []).map((tag) => tag.trim()).filter(Boolean))),
    internalNotes: draft.internalNotes?.trim() ? draft.internalNotes.trim() : null,
  };
}

export function ProgramsDetailEngineClientPage() {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const id = params?.id ? String(params.id) : "";
  const mode = id === "new" || pathname.endsWith("/programs/new") ? "create" : "edit";
  const isEdit = mode === "edit";
  const returnTo = searchParams.get("returnTo");

  const canRead = hasModulePermission(programsDetailModuleDefinition, "canRead", permissions);
  const canCreate = hasModulePermission(programsDetailModuleDefinition, "canCreate", permissions);
  const canEdit = canUseModuleAction(programsDetailModuleDefinition, "edit", permissions);
  const canAudit = canUseModuleAction(programsDetailModuleDefinition, "audit", permissions);
  const { users: mentionableUsers } = useMentionableUsers("programs.read");

  const canAccessPage = mode === "create" ? canCreate : canRead;
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const [program, setProgram] = React.useState<ApiProgram | null>(null);
  const [draft, setDraft] = React.useState<ProgramDetailDraft>(buildDraft());
  const [projectRows, setProjectRows] = React.useState<ApiProject[]>([]);
  const [loading, setLoading] = React.useState(isEdit);
  const [projectsLoading, setProjectsLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [commentDraft, setCommentDraft] = React.useState(EMPTY_COMMENT_DRAFT);
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null);

  const usageItems = React.useMemo(
    () => buildUsageDocumentationItems("programs-detail", PROGRAM_USAGE_TEXT.detail.sections),
    [],
  );

  useRegisterUsageDocumentation({
    title: PROGRAM_USAGE_TEXT.detail.title,
    items: usageItems,
  });

  const persistDraft = React.useCallback(
    async (nextDraft: ProgramDetailDraft) => {
      const normalized = normalizeDraft(nextDraft);
      const updated = await dataProvider.update<ApiProgram>(
        programsDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "programs.detail",
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
      setProgram(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [dataProvider, id],
  );

  const autoSave = useDetailAutoSaveController<ProgramDetailDraft>({
    draft,
    enabled: isEdit && canEdit,
    config: getModuleDetailEditingConfig(programsDetailModuleDefinition),
    normalizeDraft,
    onSave: persistDraft,
    onError: (error) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao salvar programa.";
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
    if (!token || !canAccessPage || !isEdit || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    dataProvider
      .read<ApiProgram>("programs.detail", id)
      .then((loaded) => {
        const nextDraft = buildDraft(loaded);
        setProgram(loaded);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      })
      .catch((error) => {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao carregar programa.";
        toast({ variant: "destructive", title: "Falha ao carregar", description: message });
      })
      .finally(() => setLoading(false));
  }, [canAccessPage, dataProvider, id, isEdit, replaceSavedDraft, toast, token]);

  React.useEffect(() => {
    if (!token || !isEdit || !id || !canRead) {
      setProjectRows([]);
      return;
    }

    setProjectsLoading(true);
    listProjects(token, { programId: id, all: true })
      .then((response) => setProjectRows(response.data ?? []))
      .catch(() => setProjectRows([]))
      .finally(() => setProjectsLoading(false));
  }, [canRead, id, isEdit, token]);

  const handleCreate = React.useCallback(async () => {
    if (!canCreate) return;
    const normalized = normalizeDraft(draft);
    if (!normalized.name) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: "Informe o nome do programa.",
      });
      return;
    }

    setBusy(true);
    try {
      const created = await dataProvider.create<ApiProgram>("programs.detail", {
        ...normalized,
        startsAt: normalized.startsAt || null,
        endsAt: normalized.endsAt || null,
        description: normalized.description || null,
        tags: normalized.tags ?? [],
        internalNotes: normalized.internalNotes,
      });
      toast({ variant: "success", title: "Programa criado" });
      router.replace(withTenantPath(`${PROGRAMS_ROUTES.detail}/${created.id}`, tenantSlug));
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao criar programa.";
      toast({ variant: "destructive", title: "Falha ao criar", description: message });
    } finally {
      setBusy(false);
    }
  }, [canCreate, dataProvider, draft, router, tenantSlug, toast]);

  const handleSubmitComment = React.useCallback(async () => {
    if (!token || !id || !commentDraft.body.trim()) return;
    setCommentSubmitting(true);
    try {
      const updated = await addProgramComment(token, id, commentDraft);
      const nextDraft = buildDraft(updated);
      setProgram(updated);
      setDraft(nextDraft);
      replaceSavedDraft(nextDraft);
      setCommentDraft(EMPTY_COMMENT_DRAFT);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao comentar no programa.";
      toast({ variant: "destructive", title: "Falha ao comentar", description: message });
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft, id, replaceSavedDraft, toast, token]);

  const handleDeleteComment = React.useCallback(
    async (commentId: string) => {
      if (!token || !id) return;
      if (!window.confirm("Excluir este comentário?")) return;
      setCommentSubmitting(true);
      try {
        const updated = await deleteProgramComment(token, id, commentId);
        const nextDraft = buildDraft(updated);
        setProgram(updated);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao excluir comentário.";
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
        const uploaded = await uploadProgramAttachment(token, file);
        const updated = await addProgramAttachment(token, id, {
          label: uploaded.originalName?.trim() || file.name.trim() || "Anexo",
          filePath: uploaded.path,
          mimeType: uploaded.mimeType ?? file.type ?? null,
          fileSizeBytes: uploaded.size ?? file.size,
        });
        const nextDraft = buildDraft(updated);
        setProgram(updated);
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
        const updated = await deleteProgramAttachment(token, id, attachmentId);
        const nextDraft = buildDraft(updated);
        setProgram(updated);
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

  const closeHref = React.useMemo(() => {
    if (returnTo) return returnTo;
    return withTenantPath(PROGRAMS_ROUTES.list, tenantSlug);
  }, [returnTo, tenantSlug]);

  const context = React.useMemo<ProgramsDetailLayoutContext>(
    () => ({
      mode,
      readOnly: mode === "create" ? !canCreate : !canEdit,
      canAudit,
      canEdit,
      program,
      draft,
      setDraft,
      projectRows,
      projectsLoading,
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
      onOpenProject: (projectId) =>
        router.push(
          withTenantPath(
            `/projects/${projectId}?returnTo=${encodeURIComponent(pathname)}`,
            tenantSlug,
          ),
        ),
      onCreateProject: () =>
        router.push(
          withTenantPath(
            `/projects/new?programId=${encodeURIComponent(id)}&returnTo=${encodeURIComponent(pathname)}`,
            tenantSlug,
          ),
        ),
      auditVisibleCount,
      onAuditVisibleCountChange: setAuditVisibleCount,
    }),
    [
      attachmentUploading,
      auditVisibleCount,
      canAudit,
      canCreate,
      canEdit,
      commentDraft,
      commentSubmitting,
      commitField,
      draft,
      handleDeleteAttachment,
      handleDeleteComment,
      handleSubmitComment,
      id,
      mentionableUsers,
      mode,
      pathname,
      program,
      projectRows,
      projectsLoading,
      router,
      tenantSlug,
    ],
  );

  if (!canAccessPage) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Sem permissão.</div>;
  }

  const headerTitle =
    mode === "create" ? "Novo programa" : program?.name || draft.name || "Programa";

  return (
    <>
      <input
        ref={attachmentInputRef}
        type="file"
        className="hidden"
        onChange={handleSelectAttachment}
      />
      <DetailShellEngine<ProgramsDetailLayoutContext>
        moduleDefinition={programsDetailModuleDefinition}
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
          { label: "Programas", href: PROGRAMS_ROUTES.list },
          ...(mode === "edit" ? [{ label: headerTitle }] : []),
        ]}
      />
    </>
  );
}
