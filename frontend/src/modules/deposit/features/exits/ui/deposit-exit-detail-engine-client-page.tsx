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
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/confirm/use-confirm";
import { useAuth } from "@/features/auth/auth-context";
import { useMentionableUsers } from "@/features/auth/use-mentionable-users";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { uploadDepositAttachment } from "@/features/uploads/api";
import { formatDateOnlyPtBR } from "@/lib/date";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  addDepositExitAttachment,
  addDepositExitComment,
  createDepositSector,
  deleteDepositExitAttachment,
  deleteDepositExitComment,
  listDepositEntries,
  listDepositSectors,
  type ApiDepositEntry,
  type ApiDepositExit,
  type ApiDepositItem,
} from "@/modules/deposit/api";
import {
  type DepositExitDetailLayoutContext,
  type DepositExitDraft,
} from "@/modules/deposit/config/deposit-detail-layout-contract";
import { depositExitDetailModuleDefinition } from "@/modules/deposit/config/deposit-module-contract";
import {
  buildDepositEntryAuditLabel,
  localIsoDate,
  normalizeStringOrNull,
} from "@/modules/deposit/features/items/domain/deposit-item-detail.helpers";
import {
  DEPOSIT_DEFAULT_SECTOR,
  DEPOSIT_DEFAULT_UNIT,
  DEPOSIT_ROUTES,
  DEPOSIT_USAGE_TEXT,
} from "@/modules/deposit/shared/domain/deposit.constants";
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

function draftFromExit(exit: ApiDepositExit): DepositExitDraft {
  return {
    entryId: exit.entryIds?.length ? String(exit.entryIds[0] ?? "") : "",
    sector: exit.sector ?? DEPOSIT_DEFAULT_SECTOR,
    quantity: Number(exit.quantity ?? 0),
    unit: exit.unit ?? DEPOSIT_DEFAULT_UNIT,
    exitDate: String(exit.exitDate ?? "").slice(0, 10),
    type: exit.type ?? "FINAL_REMOVAL",
    destinationName: exit.destinationName ?? "",
    destinationType: exit.destinationType ?? "",
    expectedReturnAt: exit.expectedReturnAt ? String(exit.expectedReturnAt).slice(0, 10) : "",
    returnedAt: exit.returnedAt ? String(exit.returnedAt).slice(0, 10) : "",
    returnedQuantity: Number(exit.returnedQuantity ?? 0),
    returnNotes: exit.returnNotes ?? "",
    notes: exit.notes ?? "",
  };
}

function resolveRemaining(entry: ApiDepositEntry) {
  if (typeof entry.remaining === "number") return entry.remaining;
  if (typeof entry.allocatedTotal === "number") return entry.quantity - entry.allocatedTotal;
  return entry.quantity;
}

export function DepositExitDetailEngineClientPage({
  mode,
}: {
  mode: Mode;
}) {
  const params = useParams<{ id?: string }>();
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { users: mentionableUsers } = useMentionableUsers("deposit.read");
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const canRead = hasModulePermission(
    depositExitDetailModuleDefinition,
    "canRead",
    permissions,
  );
  const canCreate = canUseModuleAction(
    depositExitDetailModuleDefinition,
    "create",
    permissions,
  );
  const canUpdate = canUseModuleAction(
    depositExitDetailModuleDefinition,
    "edit",
    permissions,
  );
  const canDeleteAction = canUseModuleAction(
    depositExitDetailModuleDefinition,
    "delete",
    permissions,
  );

  const id = mode === "edit" ? (params?.id ? String(params.id) : "") : "";
  const itemIdFromQuery = searchParams.get("itemId") ?? "";
  const entryIdFromQuery = searchParams.get("entryId") ?? "";
  const returnTo = searchParams.get("returnTo");
  const entryLocked = Boolean(entryIdFromQuery);

  const canAccessPage = mode === "create" ? canCreate : canRead;
  const enabled = Boolean(token && canAccessPage && (mode === "create" ? itemIdFromQuery : id));
  const readOnly = mode === "edit" ? !canUpdate : !canCreate;

  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const [item, setItem] = React.useState<ApiDepositItem | null>(null);
  const [exit, setExit] = React.useState<ApiDepositExit | null>(null);
  const [draft, setDraft] = React.useState<DepositExitDraft>({
    entryId: "",
    sector: DEPOSIT_DEFAULT_SECTOR,
    quantity: 1,
    unit: DEPOSIT_DEFAULT_UNIT,
    exitDate: localIsoDate(),
    type: "FINAL_REMOVAL",
    destinationName: "",
    destinationType: "",
    expectedReturnAt: "",
    returnedAt: "",
    returnedQuantity: 0,
    returnNotes: "",
    notes: "",
  });
  const [loading, setLoading] = React.useState(mode === "edit");
  const [busy, setBusy] = React.useState(false);
  const [entriesLoading, setEntriesLoading] = React.useState(false);
  const [entries, setEntries] = React.useState<ApiDepositEntry[]>([]);
  const [sectorsLoading, setSectorsLoading] = React.useState(false);
  const [sectors, setSectors] = React.useState<string[]>([]);
  const [newSectorOpen, setNewSectorOpen] = React.useState(false);
  const [newSectorName, setNewSectorName] = React.useState("");
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);
  const [commentDraft, setCommentDraft] = React.useState({ body: "", mentionUserIds: [] as string[] });
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [tags, setTags] = React.useState<string[]>([]);
  const [internalNotes, setInternalNotes] = React.useState<string | null>(null);

  const usageItems = React.useMemo(
    () => buildUsageDocumentationItems("deposit-exits-detail", DEPOSIT_USAGE_TEXT.exits.sections),
    [],
  );

  useRegisterUsageDocumentation({
    title: DEPOSIT_USAGE_TEXT.exits.title,
    items: usageItems,
  });

  const persistExitDraft = React.useCallback(
    async (nextDraft: DepositExitDraft) => {
      if (!exit) {
        return nextDraft;
      }

      const updated = await dataProvider.update<ApiDepositExit>("deposit.exits", exit.id, {
        entryId: nextDraft.entryId.trim() ? nextDraft.entryId.trim() : undefined,
        sector: nextDraft.sector,
        quantity: Number(nextDraft.quantity),
        unit: nextDraft.unit,
        exitDate: nextDraft.exitDate.trim() ? nextDraft.exitDate.trim() : undefined,
        type: nextDraft.type,
        destinationName: normalizeStringOrNull(nextDraft.destinationName),
        destinationType: normalizeStringOrNull(nextDraft.destinationType),
        expectedReturnAt: nextDraft.expectedReturnAt.trim() ? nextDraft.expectedReturnAt.trim() : null,
        returnedAt: nextDraft.returnedAt.trim() ? nextDraft.returnedAt.trim() : null,
        returnedQuantity: nextDraft.returnedQuantity > 0 ? Number(nextDraft.returnedQuantity) : null,
        returnNotes: normalizeStringOrNull(nextDraft.returnNotes),
        notes: normalizeStringOrNull(nextDraft.notes),
      });
      const savedDraft = draftFromExit(updated);
      setExit(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [dataProvider, exit],
  );

  const autoSave = useDetailAutoSaveController<DepositExitDraft>({
    draft,
    enabled: mode === "edit" && canUpdate && Boolean(exit),
    config: getModuleDetailEditingConfig(depositExitDetailModuleDefinition),
    onSave: persistExitDraft,
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
    commitDraft,
    commitField,
  } = autoSave;
  const saving = busy || autoSaving;

  React.useEffect(() => {
    setAuditVisibleCount(24);
  }, [id, mode]);

  React.useEffect(() => {
    if (!entryIdFromQuery) return;
    setDraft((previous) => ({ ...previous, entryId: entryIdFromQuery }));
  }, [entryIdFromQuery]);

  const close = React.useCallback(() => {
    if (returnTo && returnTo.startsWith("/")) {
      router.push(returnTo);
      return;
    }

    const nextItemId = mode === "edit" ? exit?.itemId : itemIdFromQuery;
    if (nextItemId) {
      router.push(withTenantPath(`${DEPOSIT_ROUTES.items}/${nextItemId}`, tenantSlug));
      return;
    }

    router.push(withTenantPath(DEPOSIT_ROUTES.stock, tenantSlug));
  }, [exit?.itemId, itemIdFromQuery, mode, returnTo, router, tenantSlug]);

  const openEntryDetail = React.useCallback(
    (entryId: string) => {
      const href = withTenantPath(`${DEPOSIT_ROUTES.entries}/${entryId}`, tenantSlug);
      router.push(`${href}?returnTo=${encodeURIComponent(pathname)}`);
    },
    [pathname, router, tenantSlug],
  );

  const loadItem = React.useCallback(async () => {
    if (!enabled || mode !== "create" || !itemIdFromQuery) {
      if (mode === "create") {
        setItem(null);
      }
      return;
    }

    setLoading(true);
    try {
      const loaded = await dataProvider.read<ApiDepositItem>("deposit.items", itemIdFromQuery);
      setItem(loaded);
      setDraft((previous) => ({
        ...previous,
        unit: loaded.unit ?? previous.unit,
        sector: loaded.defaultSector ?? previous.sector,
      }));
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao carregar objeto.";

      toast({
        variant: "destructive",
        title: "Falha ao carregar",
        description: message,
      });
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [dataProvider, enabled, itemIdFromQuery, mode, toast]);

  const loadExit = React.useCallback(async () => {
    if (!enabled || mode !== "edit") return;

    setLoading(true);
    try {
      const loaded = await dataProvider.read<ApiDepositExit>("deposit.exits", id);
      const nextDraft = draftFromExit(loaded);
      setExit(loaded);
      setDraft(nextDraft);
      setTags(loaded.tags ?? []);
      setInternalNotes(loaded.internalNotes ?? null);
      replaceSavedDraft(nextDraft);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao carregar saida.";

      toast({
        variant: "destructive",
        title: "Falha ao carregar",
        description: message,
      });
      setExit(null);
    } finally {
      setLoading(false);
    }
  }, [dataProvider, enabled, id, mode, replaceSavedDraft, toast]);

  const loadEntries = React.useCallback(async () => {
    const nextItemId = mode === "edit" ? exit?.itemId : itemIdFromQuery;
    if (!token || !enabled || !nextItemId) {
      setEntries([]);
      return;
    }

    setEntriesLoading(true);
    try {
      const response = await listDepositEntries(token, { itemId: nextItemId, all: true });
      const allRows = response.data ?? [];
      const availableRows = allRows
        .filter((row) => !row.isClosed)
        .filter((row) => resolveRemaining(row) > 0);

      const forcedRow =
        draft.entryId && !availableRows.some((row) => row.id === draft.entryId)
          ? allRows.find((row) => row.id === draft.entryId) ?? null
          : null;

      const rows = (forcedRow ? [forcedRow, ...availableRows] : availableRows).sort(
        (left, right) =>
          String(left.expiryDate ?? left.entryDate ?? "").localeCompare(
            String(right.expiryDate ?? right.entryDate ?? ""),
          ),
      );
      setEntries(rows);
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }, [draft.entryId, enabled, exit?.itemId, itemIdFromQuery, mode, token]);

  const loadSectors = React.useCallback(async () => {
    if (!token || !enabled) {
      setSectors([]);
      return;
    }

    setSectorsLoading(true);
    try {
      const response = await listDepositSectors(token);
      const rows = response.data.map((sector) => sector.name).filter(Boolean);
      setSectors(rows.sort((left, right) => left.localeCompare(right)));
    } catch {
      setSectors([]);
    } finally {
      setSectorsLoading(false);
    }
  }, [enabled, token]);

  React.useEffect(() => {
    void loadItem();
  }, [loadItem]);

  React.useEffect(() => {
    void loadExit();
  }, [loadExit]);

  React.useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  React.useEffect(() => {
    void loadSectors();
  }, [loadSectors]);

  const sectorOptions = React.useMemo(() => {
    const values = new Set<string>([DEPOSIT_DEFAULT_SECTOR, ...sectors]);
    if (draft.sector?.trim()) {
      values.add(draft.sector.trim());
    }
    return Array.from(values)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }, [draft.sector, sectors]);

  const selectedEntry = React.useMemo(() => {
    if (!draft.entryId) return null;
    return entries.find((row) => row.id === draft.entryId) ?? null;
  }, [draft.entryId, entries]);

  const createExit = React.useCallback(async () => {
    if (!enabled || mode !== "create" || !itemIdFromQuery) return;

    if (!canCreate) {
      toast({
        variant: "destructive",
        title: "Sem permissão",
        description: "Você não tem permissão para registrar saídas.",
      });
      return;
    }

    const quantity = Number(draft.quantity);
    const sector = String(draft.sector ?? "").trim();
    const unit = String(draft.unit ?? "").trim();
    if (!sector || !unit || !Number.isFinite(quantity) || quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: "Informe setor, unidade e quantidade.",
      });
      return;
    }

    setBusy(true);
    try {
      await dataProvider.create<ApiDepositExit>("deposit.exits", {
        itemId: itemIdFromQuery,
        entryId: draft.entryId.trim() ? draft.entryId.trim() : undefined,
        sector,
        quantity,
        unit,
        exitDate: draft.exitDate.trim() ? draft.exitDate.trim() : undefined,
        type: draft.type,
        destinationName: draft.destinationName.trim() ? draft.destinationName.trim() : null,
        destinationType: draft.destinationType.trim() ? draft.destinationType.trim() : null,
        expectedReturnAt: draft.expectedReturnAt.trim() ? draft.expectedReturnAt.trim() : null,
        returnedAt: draft.returnedAt.trim() ? draft.returnedAt.trim() : null,
        returnedQuantity: draft.returnedQuantity > 0 ? Number(draft.returnedQuantity) : null,
        returnNotes: draft.returnNotes.trim() ? draft.returnNotes.trim() : null,
        notes: draft.notes.trim() ? draft.notes.trim() : null,
        tags,
        internalNotes,
      });
      toast({ variant: "success", title: "Saída registrada" });
      close();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao registrar saída.";

      toast({
        variant: "destructive",
        title: "Falha",
        description: message,
      });
    } finally {
      setBusy(false);
    }
  }, [canCreate, close, dataProvider, draft, enabled, internalNotes, itemIdFromQuery, mode, tags, toast]);

  const persistMetadata = React.useCallback(
    async (patch: { tags?: string[]; internalNotes?: string | null }) => {
      if (mode !== "edit" || !id) return;
      const updated = await dataProvider.update<ApiDepositExit>("deposit.exits", id, patch);
      setExit(updated);
      setTags(updated.tags ?? []);
      setInternalNotes(updated.internalNotes ?? null);
    },
    [dataProvider, id, mode],
  );

  const createSector = React.useCallback(async () => {
    if (!token) return;
    const name = newSectorName.trim();
    if (!name) return;

    setBusy(true);
    try {
      await createDepositSector(token, { name });
      setNewSectorOpen(false);
      setNewSectorName("");
      await loadSectors();
      setDraft((previous) => ({ ...previous, sector: name }));

      if (mode === "edit") {
        void commitField("sector", name);
      }
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao criar setor.";

      toast({
        variant: "destructive",
        title: "Falha ao criar",
        description: message,
      });
    } finally {
      setBusy(false);
    }
  }, [commitField, loadSectors, mode, newSectorName, toast, token]);

  const handleDelete = React.useCallback(async () => {
    if (!exit || !canDeleteAction) return;

    const confirmed = await confirm({
      title: "Excluir saída?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      confirmVariant: "destructive",
    });

    if (!confirmed) return;

    setBusy(true);
    try {
      await dataProvider.delete("deposit.exits", exit.id);
      toast({ variant: "success", title: "Saída excluída" });
      close();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao excluir saída.";

      toast({
        variant: "destructive",
        title: "Falha ao excluir",
        description: message,
      });
    } finally {
      setBusy(false);
    }
  }, [canDeleteAction, close, confirm, dataProvider, exit, toast]);

  const donorNameById = React.useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        entries
          .map((entry) => [entry.donor?.id, entry.donor?.name] as const)
          .filter(([donorId, donorName]) => Boolean(donorId && donorName))
          .map(([donorId, donorName]) => [String(donorId), String(donorName)]),
      ),
    [entries],
  );

  const entryLabelById = React.useMemo<Record<string, string>>(
    () => Object.fromEntries(entries.map((entry) => [entry.id, buildDepositEntryAuditLabel(entry)])),
    [entries],
  );

  const entryById = React.useMemo<Record<string, ApiDepositEntry>>(
    () => Object.fromEntries(entries.map((entry) => [entry.id, entry])),
    [entries],
  );

  const submitComment = React.useCallback(async () => {
    if (!token || mode !== "edit" || !id || !commentDraft.body.trim()) return;
    setCommentSubmitting(true);
    try {
      const updated = await addDepositExitComment(token, id, {
        body: commentDraft.body.trim(),
        mentionUserIds: commentDraft.mentionUserIds,
      });
      setExit(updated);
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
      const updated = await deleteDepositExitComment(token, id, commentId);
      setExit(updated);
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
        const updated = await addDepositExitAttachment(token, id, {
          label: uploaded.originalName?.trim() || file.name.trim() || "Anexo",
          filePath: uploaded.path,
          mimeType: uploaded.mimeType ?? file.type ?? null,
          fileSizeBytes: uploaded.size ?? file.size,
        });
        setExit(updated);
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
      const updated = await deleteDepositExitAttachment(token, id, attachmentId);
      setExit(updated);
    },
    [id, mode, token],
  );

  const historyItems = React.useMemo<DepositExitDetailLayoutContext["historyItems"]>(
    () => {
      const items: DepositExitDetailLayoutContext["historyItems"] = [];
      if (exit) {
        items.push({
          id: `${exit.id}:created`,
          title: "Saída criada",
          description: exit.item?.name ?? "Saída",
          meta: "Criada",
          createdAt: exit.createdAt,
        });
      }
      items.push(
        ...(exit?.comments ?? []).map((comment) => ({
          id: `comment:${comment.id}`,
          title: "Comentário registrado",
          description: comment.body,
          meta: `Por ${comment.author.name}`,
          createdAt: comment.createdAt,
        })),
      );
      items.push(
        ...(exit?.attachments ?? []).map((attachment) => ({
          id: `attachment:${attachment.id}`,
          title: "Anexo adicionado",
          description: attachment.label,
          meta: attachment.sizeLabel ?? attachment.mimeType ?? "Anexo",
          createdAt: attachment.createdAt,
        })),
      );
      return items;
    },
    [exit],
  );

  const headerTitle =
    mode === "create"
      ? item?.name
        ? `Nova saida de ${item.name}`
        : "Nova saida"
      : exit
        ? `Saida - ${formatDateOnlyPtBR(exit.exitDate)}`
        : "Saida";

  const context = React.useMemo<DepositExitDetailLayoutContext>(
    () => ({
      mode,
      readOnly,
      saving,
      entryLocked,
      draft,
      setDraft,
      exit,
      entriesLoading,
      entries,
      selectedEntry,
      sectorsLoading,
      sectorOptions,
      donorNameById,
      entryLabelById,
      entryById,
      onCommitField: (key) => {
        void commitField(key);
      },
      onPatch: (patch) => {
        if (mode === "edit") {
          void commitDraft({ ...draft, ...patch });
        }
      },
      onOpenNewSector: () => setNewSectorOpen(true),
      onOpenEntry: openEntryDetail,
      onDelete: handleDelete,
      auditVisibleCount,
      onAuditVisibleCountChange: setAuditVisibleCount,
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
      commitDraft,
      commitField,
      deleteAttachment,
      deleteComment,
      donorNameById,
      draft,
      entries,
      entriesLoading,
      entryById,
      entryLabelById,
      entryLocked,
      exit,
      historyItems,
      handleDelete,
      internalNotes,
      mentionableUsers,
      mode,
      openEntryDetail,
      persistMetadata,
      readOnly,
      saving,
      sectorOptions,
      sectorsLoading,
      selectedEntry,
      setDraft,
      submitComment,
      tags,
      uploadAttachment,
    ],
  );

  if (!canAccessPage) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Sem permissao.</div>;
  }

  if (mode === "create" && !itemIdFromQuery) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Informe um item para registrar saida.
      </div>
    );
  }

  return (
    <>
      <DetailShellEngine<DepositExitDetailLayoutContext>
        moduleDefinition={depositExitDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        mode={mode}
        headerTitle={headerTitle}
        saving={saving}
        loading={loading}
        readOnly={readOnly}
        onSave={mode === "create" ? createExit : undefined}
        onClose={close}
        breadcrumbTitle={headerTitle}
        breadcrumbItems={[
          { label: "Deposito", href: DEPOSIT_ROUTES.stock },
          ...(mode === "edit" && exit?.item?.name
            ? [{ label: exit.item.name, href: `${DEPOSIT_ROUTES.items}/${exit.itemId}` }]
            : mode === "create" && item?.name
              ? [{ label: item.name, href: `${DEPOSIT_ROUTES.items}/${item.id}` }]
              : []),
          ...(mode === "edit" ? [{ label: "Saida" }] : []),
        ]}
        headerActionsSlot={
          mode === "edit" && canDeleteAction ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="mr-1 size-4" />
              Excluir
            </Button>
          ) : null
        }
      />

      <Dialog open={newSectorOpen} onOpenChange={setNewSectorOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Novo setor</DialogTitle>
          </DialogHeader>

          <Input
            value={newSectorName}
            onChange={(event) => setNewSectorName(event.target.value)}
            placeholder="Ex: Estoque"
            autoFocus
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewSectorOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={createSector}
              disabled={!newSectorName.trim() || saving}
            >
              {saving ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DepositExitNewEngineClientPage() {
  return <DepositExitDetailEngineClientPage mode="create" />;
}

export function DepositExitEditEngineClientPage() {
  return <DepositExitDetailEngineClientPage mode="edit" />;
}
