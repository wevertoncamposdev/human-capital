"use client";

import * as React from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useRegisterUsageDocumentation } from "@/components/UsageDocumentation/UsageDocumentationProvider";
import { buildUsageDocumentationItems } from "@/components/UsageDocumentation/usage-documentation.helpers";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useMentionableUsers } from "@/features/auth/use-mentionable-users";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { uploadAvatar, uploadDepositAttachment } from "@/features/uploads/api";
import { stripApiUrl } from "@/lib/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  addDepositDonorAttachment,
  addDepositDonorComment,
  deleteDepositDonorAttachment,
  deleteDepositDonorComment,
  listDepositEntries,
  type ApiDepositDonor,
  type ApiDepositEntry,
} from "@/modules/deposit/api";
import {
  type DepositDonorDetailLayoutContext,
  type DepositDonorDraft,
} from "@/modules/deposit/config/deposit-detail-layout-contract";
import { depositDonorDetailModuleDefinition } from "@/modules/deposit/config/deposit-module-contract";
import { DEPOSIT_ROUTES, DEPOSIT_USAGE_TEXT } from "@/modules/deposit/shared/domain/deposit.constants";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { resumeDetailAutoSave, suspendDetailAutoSave } from "@/web-client/detail/detail-media-autosave-guard";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import {
  canUseModuleAction,
  getModuleDetailEditingConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";

type Mode = "create" | "edit";

function normalizeStringOrNull(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function normalizeDraft(draft: DepositDonorDraft): DepositDonorDraft {
  return {
    name: draft.name.trim(),
    type: draft.type,
    contact: normalizeStringOrNull(draft.contact),
    avatarUrl:
      draft.avatarUrl instanceof File
        ? draft.avatarUrl
        : typeof draft.avatarUrl === "string"
          ? normalizeStringOrNull(stripApiUrl(draft.avatarUrl))
          : null,
  };
}

function draftFromDonor(donor: ApiDepositDonor): DepositDonorDraft {
  return {
    name: donor.name ?? "",
    type: donor.type ?? "PERSON",
    contact: donor.contact ?? null,
    avatarUrl: donor.avatarUrl ?? null,
  };
}

function buildReturnUrl(returnTo: string, donorId: string) {
  try {
    const url = new URL(returnTo, window.location.origin);
    url.searchParams.set("donorId", donorId);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function DepositDonorDetailEngineClientPage({
  mode,
}: {
  mode: Mode;
}) {
  const params = useParams<{ id?: string }>();
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { users: mentionableUsers } = useMentionableUsers("deposit.read");
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const canRead = hasModulePermission(
    depositDonorDetailModuleDefinition,
    "canRead",
    permissions,
  );
  const canCreate = canUseModuleAction(
    depositDonorDetailModuleDefinition,
    "create",
    permissions,
  );
  const canUpdate = canUseModuleAction(
    depositDonorDetailModuleDefinition,
    "edit",
    permissions,
  );

  const id = mode === "edit" ? (params?.id ? String(params.id) : "") : "";
  const canAccessPage = mode === "create" ? canCreate : canRead;
  const enabled = Boolean(token && canAccessPage && (mode === "create" || id));
  const returnTo = searchParams.get("returnTo");

  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const [donor, setDonor] = React.useState<ApiDepositDonor | null>(null);
  const [draft, setDraft] = React.useState<DepositDonorDraft>({
    name: "",
    type: "PERSON",
    contact: null,
    avatarUrl: null,
  });
  const [loading, setLoading] = React.useState(mode === "edit");
  const [busy, setBusy] = React.useState(false);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);
  const [commentDraft, setCommentDraft] = React.useState({ body: "", mentionUserIds: [] as string[] });
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [tags, setTags] = React.useState<string[]>([]);
  const [internalNotes, setInternalNotes] = React.useState<string | null>(null);
  const [entriesLoading, setEntriesLoading] = React.useState(false);
  const [entries, setEntries] = React.useState<ApiDepositEntry[]>([]);
  const [donors, setDonors] = React.useState<ApiDepositDonor[]>([]);

  const usageItems = React.useMemo(
    () => buildUsageDocumentationItems("deposit-donors-detail", DEPOSIT_USAGE_TEXT.donors.sections),
    [],
  );

  useRegisterUsageDocumentation({
    title: DEPOSIT_USAGE_TEXT.donors.title,
    items: usageItems,
  });

  const persistDonorDraft = React.useCallback(
    async (nextDraft: DepositDonorDraft) => {
      const normalizedDraft = normalizeDraft(nextDraft);
      const avatarUrl =
        normalizedDraft.avatarUrl instanceof File
          ? (await uploadAvatar(token ?? "", normalizedDraft.avatarUrl)).path
          : normalizedDraft.avatarUrl;
      const updated = await dataProvider.update<ApiDepositDonor>(
        depositDonorDetailModuleDefinition.queryAdapters.detailDataProvider?.model ??
          "deposit.donors",
        id,
        {
          ...normalizedDraft,
          avatarUrl,
        },
      );
      const savedDraft = draftFromDonor(updated);
      setDonor(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [dataProvider, id, token],
  );

  const autoSave = useDetailAutoSaveController<DepositDonorDraft>({
    draft,
    enabled: mode === "edit" && canUpdate,
    config: getModuleDetailEditingConfig(depositDonorDetailModuleDefinition),
    normalizeDraft,
    onSave: persistDonorDraft,
    onError: (error) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao salvar.";

      toast({
        variant: "destructive",
        title: "Falha ao salvar",
        description: message,
      });
    },
  });
  const {
    saving: autoSaving,
    replaceSavedDraft,
    commitField,
  } = autoSave;
  const saving = busy || autoSaving;

  React.useEffect(() => {
    setAuditVisibleCount(24);
  }, [id, mode]);

  const readOnly = mode === "edit" ? !canUpdate : !canCreate;

  const close = React.useCallback(() => {
    if (returnTo && returnTo.startsWith("/")) {
      router.push(returnTo);
      return;
    }

    router.push(withTenantPath(DEPOSIT_ROUTES.donors, tenantSlug));
  }, [returnTo, router, tenantSlug]);

  const loadDonor = React.useCallback(async () => {
    if (!enabled || mode !== "edit") return;
    setLoading(true);

    try {
      const loaded = await dataProvider.read<ApiDepositDonor>(
        depositDonorDetailModuleDefinition.queryAdapters.detailDataProvider?.model ??
          "deposit.donors",
        id,
      );
      const nextDraft = draftFromDonor(loaded);
      setDonor(loaded);
      setDraft(nextDraft);
      setTags(loaded.tags ?? []);
      setInternalNotes(loaded.internalNotes ?? null);
      replaceSavedDraft(nextDraft);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao carregar fonte.";

      toast({
        variant: "destructive",
        title: "Falha ao carregar",
        description: message,
      });
      setDonor(null);
    } finally {
      setLoading(false);
    }
  }, [dataProvider, enabled, id, mode, replaceSavedDraft, toast]);

  const loadEntries = React.useCallback(async () => {
    if (!token || !enabled || mode !== "edit" || !id) return;
    setEntriesLoading(true);

    try {
      const response = await listDepositEntries(token, { donorId: id, limit: 200 });
      const nextEntries = response.data ?? [];
      nextEntries.sort((left, right) =>
        String(right.entryDate ?? "").localeCompare(String(left.entryDate ?? "")),
      );
      setEntries(nextEntries);
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }, [enabled, id, mode, token]);

  const loadDonors = React.useCallback(async () => {
    if (!enabled || mode !== "edit") {
      setDonors([]);
      return;
    }

    try {
      const response = await dataProvider.search<ApiDepositDonor>("deposit.donors", {
        all: true,
      });
      setDonors(response.data ?? []);
    } catch {
      setDonors([]);
    }
  }, [dataProvider, enabled, mode]);

  React.useEffect(() => {
    void loadDonor();
  }, [loadDonor]);

  React.useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  React.useEffect(() => {
    void loadDonors();
  }, [loadDonors]);

  const createDonor = React.useCallback(async () => {
    if (!enabled) return;

    if (!canCreate) {
      toast({
        variant: "destructive",
        title: "Sem permissão",
        description: "Você não tem permissão para criar fontes.",
      });
      return;
    }

    const normalized = normalizeDraft(draft);
    if (!normalized.name) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: "Informe o nome.",
      });
      return;
    }

    setBusy(true);
    try {
      const avatarUrl =
        normalized.avatarUrl instanceof File
          ? (await uploadAvatar(token ?? "", normalized.avatarUrl)).path
          : normalized.avatarUrl;
      const created = await dataProvider.create<ApiDepositDonor>(
        depositDonorDetailModuleDefinition.queryAdapters.detailDataProvider?.model ??
          "deposit.donors",
        {
          ...normalized,
          avatarUrl,
          tags,
          internalNotes,
        },
      );

      toast({ variant: "success", title: "Fonte criado" });

      if (returnTo && returnTo.startsWith("/")) {
        const nextUrl = buildReturnUrl(returnTo, created.id);
        if (nextUrl) {
          router.push(nextUrl);
          return;
        }
      }

      router.replace(withTenantPath(`${DEPOSIT_ROUTES.donors}/${created.id}`, tenantSlug));
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao criar fonte.";

      toast({
        variant: "destructive",
        title: "Falha ao criar",
        description: message,
      });
    } finally {
      setBusy(false);
    }
  }, [canCreate, dataProvider, draft, enabled, internalNotes, returnTo, router, tags, tenantSlug, toast, token]);

  const persistMetadata = React.useCallback(
    async (patch: { tags?: string[]; internalNotes?: string | null }) => {
      if (mode !== "edit" || !id) return;
      const updated = await dataProvider.update<ApiDepositDonor>("deposit.donors", id, patch);
      setDonor(updated);
      setTags(updated.tags ?? []);
      setInternalNotes(updated.internalNotes ?? null);
    },
    [dataProvider, id, mode],
  );

  const openEntryDetail = React.useCallback(
    (entryId: string) => {
      const href = withTenantPath(`${DEPOSIT_ROUTES.entries}/${entryId}`, tenantSlug);
      router.push(`${href}?returnTo=${encodeURIComponent(pathname)}`);
    },
    [pathname, router, tenantSlug],
  );

  const donorNameById = React.useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};

    donors.forEach((row) => {
      if (row.id && row.name) {
        next[row.id] = row.name;
      }
    });

    if (donor?.id && donor.name) {
      next[donor.id] = donor.name;
    }

    return next;
  }, [donor, donors]);

  const submitComment = React.useCallback(async () => {
    if (!token || mode !== "edit" || !id || !commentDraft.body.trim()) return;
    setCommentSubmitting(true);
    try {
      const updated = await addDepositDonorComment(token, id, {
        body: commentDraft.body.trim(),
        mentionUserIds: commentDraft.mentionUserIds,
      });
      setDonor(updated);
      setTags(updated.tags ?? []);
      setInternalNotes(updated.internalNotes ?? null);
      setCommentDraft({ body: "", mentionUserIds: [] });
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft.body, commentDraft.mentionUserIds, id, mode, token]);

  const deleteComment = React.useCallback(
    async (commentId: string) => {
      if (!token || mode !== "edit" || !id) return;
      const updated = await deleteDepositDonorComment(token, id, commentId);
      setDonor(updated);
    },
    [id, mode, token],
  );

  const uploadAttachment = React.useCallback(async () => {
    if (!token || mode !== "edit" || !id) return;
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      resumeDetailAutoSave();
      if (!file) return;
      setAttachmentUploading(true);
      try {
        const uploaded = await uploadDepositAttachment(token, file);
        const updated = await addDepositDonorAttachment(token, id, {
          label: uploaded.originalName?.trim() || file.name.trim() || "Anexo",
          filePath: uploaded.path,
          mimeType: uploaded.mimeType ?? file.type ?? null,
          fileSizeBytes: uploaded.size ?? file.size,
        });
        setDonor(updated);
      } finally {
        setAttachmentUploading(false);
      }
    };
    input.oncancel = () => resumeDetailAutoSave();
    suspendDetailAutoSave();
    input.click();
  }, [id, mode, token]);

  const deleteAttachment = React.useCallback(
    async (attachmentId: string) => {
      if (!token || mode !== "edit" || !id) return;
      const updated = await deleteDepositDonorAttachment(token, id, attachmentId);
      setDonor(updated);
    },
    [id, mode, token],
  );

  const historyItems = React.useMemo<DepositDonorDetailLayoutContext["historyItems"]>(
    () => {
      const items: DepositDonorDetailLayoutContext["historyItems"] = [];
      if (donor) {
        items.push({
          id: `${donor.id}:created`,
          title: "Fonte criado",
          description: donor.name,
          meta: "Criado",
          createdAt: donor.createdAt,
        });
      }
      items.push(
        ...(donor?.comments ?? []).map((comment) => ({
          id: `comment:${comment.id}`,
          title: "Comentário registrado",
          description: comment.body,
          meta: `Por ${comment.author.name}`,
          createdAt: comment.createdAt,
        })),
      );
      items.push(
        ...(donor?.attachments ?? []).map((attachment) => ({
          id: `attachment:${attachment.id}`,
          title: "Anexo adicionado",
          description: attachment.label,
          meta: attachment.sizeLabel ?? attachment.mimeType ?? "Anexo",
          createdAt: attachment.createdAt,
        })),
      );
      return items;
    },
    [donor],
  );

  const commitAvatar = React.useCallback(
    async (file: File | null) => {
      if (mode !== "edit") {
        setDraft((currentDraft) => ({
          ...currentDraft,
          avatarUrl: file,
        }));
        return;
      }

      if (!donor || !canUpdate || !token) {
        return;
      }

      setBusy(true);
      try {
        const avatarUrl = file ? (await uploadAvatar(token, file)).path : "";
        const updated = await dataProvider.update<ApiDepositDonor>(
          depositDonorDetailModuleDefinition.queryAdapters.detailDataProvider?.model ??
            "deposit.donors",
          donor.id,
          { avatarUrl },
        );
        const nextDraft = draftFromDonor(updated);
        setDonor(updated);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao atualizar foto.";

        toast({
          variant: "destructive",
          title: "Falha ao salvar",
          description: message,
        });
      } finally {
        setBusy(false);
      }
    },
    [canUpdate, dataProvider, donor, mode, replaceSavedDraft, toast, token],
  );

  const headerTitle =
    mode === "create" ? "Nova fonte" : donor?.name ? donor.name : "Fonte";

  const context = React.useMemo<DepositDonorDetailLayoutContext>(
    () => ({
      mode,
      readOnly,
      avatarUploading: saving,
      draft,
      setDraft,
      onCommitField: (key) => {
        void commitField(key);
      },
      onTypeChange: (type) => {
        void commitField("type", type);
      },
      onAvatarFileSelect: (file) => commitAvatar(file),
      donor,
      donorNameById,
      entries,
      entriesLoading,
      auditVisibleCount,
      onAuditVisibleCountChange: setAuditVisibleCount,
      onOpenEntry: openEntryDetail,
      mentionableUsers,
      commentDraft,
      onCommentDraftChange: setCommentDraft,
      onSubmitComment: () => void submitComment(),
      onDeleteComment: (commentId) => void deleteComment(commentId),
      commentSubmitting,
      tags,
      onTagsChange: setTags,
      onTagsCommit: (next) => void persistMetadata({ tags: next, internalNotes }),
      internalNotes,
      onInternalNotesChange: setInternalNotes,
      onInternalNotesBlur: () => void persistMetadata({ tags, internalNotes }),
      onUploadAttachment: () => void uploadAttachment(),
      onDeleteAttachment: (attachmentId) => void deleteAttachment(attachmentId),
      attachmentUploading,
      historyItems,
    }),
    [
      attachmentUploading,
      auditVisibleCount,
      commentDraft,
      commentSubmitting,
      commitField,
      commitAvatar,
      deleteAttachment,
      deleteComment,
      donor,
      donorNameById,
      draft,
      entries,
      entriesLoading,
      historyItems,
      internalNotes,
      mentionableUsers,
      mode,
      openEntryDetail,
      persistMetadata,
      readOnly,
      setDraft,
      saving,
      submitComment,
      tags,
      uploadAttachment,
    ],
  );

  if (!canAccessPage) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Sem permissão.</div>;
  }

  return (
    <DetailShellEngine<DepositDonorDetailLayoutContext>
      moduleDefinition={depositDonorDetailModuleDefinition}
      context={context}
      dataProvider={dataProvider}
      mode={mode}
      headerTitle={headerTitle}
      saving={saving}
      loading={loading}
      readOnly={readOnly}
      onSave={mode === "create" ? createDonor : undefined}
      onClose={close}
      breadcrumbTitle={headerTitle}
      breadcrumbItems={[
        { label: "Depósito", href: DEPOSIT_ROUTES.stock },
        { label: "Fontes", href: DEPOSIT_ROUTES.donors },
        ...(mode === "edit" ? [{ label: headerTitle }] : []),
      ]}
    />
  );
}

export function DepositDonorNewEngineClientPage() {
  return <DepositDonorDetailEngineClientPage mode="create" />;
}

export function DepositDonorEditEngineClientPage() {
  return <DepositDonorDetailEngineClientPage mode="edit" />;
}
