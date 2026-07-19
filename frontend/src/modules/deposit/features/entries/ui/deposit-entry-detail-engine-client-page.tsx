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
  addDepositEntryAttachment,
  addDepositEntryComment,
  createDepositSector,
  deleteDepositEntryAttachment,
  deleteDepositEntryComment,
  listDepositSectors,
  listDepositExits,
  type ApiDepositDonor,
  type ApiDepositEntry,
  type ApiDepositExit,
  type ApiDepositItem,
} from "@/modules/deposit/api";
import {
  type DepositAllocatedExitRow,
  type DepositEntryDetailLayoutContext,
  type DepositEntryDraft,
} from "@/modules/deposit/config/deposit-detail-layout-contract";
import { depositEntryDetailModuleDefinition } from "@/modules/deposit/config/deposit-module-contract";
import {
  buildDepositExitAuditLabel,
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

function draftFromEntry(entry: ApiDepositEntry): DepositEntryDraft {
  return {
    donorId: entry.donorId ?? null,
    sector: entry.sector ?? DEPOSIT_DEFAULT_SECTOR,
    quantity: Number(entry.quantity ?? 0),
    unit: entry.unit ?? DEPOSIT_DEFAULT_UNIT,
    entryDate: String(entry.entryDate ?? "").slice(0, 10),
    expiryDate: "",
    notes: entry.notes ?? "",
  };
}

export function DepositEntryDetailEngineClientPage({
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
    depositEntryDetailModuleDefinition,
    "canRead",
    permissions,
  );
  const canCreate = canUseModuleAction(
    depositEntryDetailModuleDefinition,
    "create",
    permissions,
  );
  const canUpdate = canUseModuleAction(
    depositEntryDetailModuleDefinition,
    "edit",
    permissions,
  );
  const canDeleteAction = canUseModuleAction(
    depositEntryDetailModuleDefinition,
    "delete",
    permissions,
  );
  const canCreateRelatedExit = canUseModuleAction(
    depositEntryDetailModuleDefinition,
    "createExit",
    permissions,
  );

  const id = mode === "edit" ? (params?.id ? String(params.id) : "") : "";
  const itemIdFromQuery = searchParams.get("itemId") ?? "";
  const donorIdFromQuery = searchParams.get("donorId");
  const returnTo = searchParams.get("returnTo");
  const searchParamsString = searchParams.toString();

  const canAccessPage = mode === "create" ? canCreate : canRead;
  const enabled = Boolean(token && canAccessPage && (mode === "create" ? itemIdFromQuery : id));
  const readOnly = mode === "edit" ? !canUpdate : !canCreate;

  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const [item, setItem] = React.useState<ApiDepositItem | null>(null);
  const [entry, setEntry] = React.useState<ApiDepositEntry | null>(null);
  const [draft, setDraft] = React.useState<DepositEntryDraft>({
    donorId: null,
    sector: DEPOSIT_DEFAULT_SECTOR,
    quantity: 1,
    unit: DEPOSIT_DEFAULT_UNIT,
    entryDate: localIsoDate(),
    expiryDate: "",
    notes: "",
  });
  const [loading, setLoading] = React.useState(mode === "edit");
  const [busy, setBusy] = React.useState(false);
  const [donorsLoading, setDonorsLoading] = React.useState(false);
  const [donors, setDonors] = React.useState<ApiDepositDonor[]>([]);
  const [sectorsLoading, setSectorsLoading] = React.useState(false);
  const [sectors, setSectors] = React.useState<string[]>([]);
  const [allocatedExitsLoading, setAllocatedExitsLoading] = React.useState(false);
  const [allocatedExits, setAllocatedExits] = React.useState<DepositAllocatedExitRow[]>(
    [],
  );
  const [allocatedExitRecords, setAllocatedExitRecords] = React.useState<
    ApiDepositExit[]
  >([]);
  const [newSectorOpen, setNewSectorOpen] = React.useState(false);
  const [newSectorName, setNewSectorName] = React.useState("");
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);
  const [commentDraft, setCommentDraft] = React.useState({ body: "", mentionUserIds: [] as string[] });
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [tags, setTags] = React.useState<string[]>([]);
  const [internalNotes, setInternalNotes] = React.useState<string | null>(null);

  const usageItems = React.useMemo(
    () => buildUsageDocumentationItems("deposit-entries-detail", DEPOSIT_USAGE_TEXT.entries.sections),
    [],
  );

  useRegisterUsageDocumentation({
    title: DEPOSIT_USAGE_TEXT.entries.title,
    items: usageItems,
  });

  const persistEntryDraft = React.useCallback(
    async (nextDraft: DepositEntryDraft) => {
      if (!entry) {
        return nextDraft;
      }

      const updated = await dataProvider.update<ApiDepositEntry>("deposit.entries", entry.id, {
        donorId: nextDraft.donorId ?? null,
        sector: nextDraft.sector,
        quantity: Number(nextDraft.quantity),
        unit: nextDraft.unit,
        entryDate: nextDraft.entryDate.trim() ? nextDraft.entryDate.trim() : undefined,
        expiryDate: null,
        notes: normalizeStringOrNull(nextDraft.notes),
      });
      const savedDraft = draftFromEntry(updated);
      setEntry(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [dataProvider, entry],
  );

  const autoSave = useDetailAutoSaveController<DepositEntryDraft>({
    draft,
    enabled: mode === "edit" && canUpdate && Boolean(entry),
    config: getModuleDetailEditingConfig(depositEntryDetailModuleDefinition),
    onSave: persistEntryDraft,
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
    if (!donorIdFromQuery) return;
    setDraft((previous) => ({ ...previous, donorId: donorIdFromQuery }));

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.delete("donorId");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl);
  }, [donorIdFromQuery, pathname, router, searchParamsString]);

  const close = React.useCallback(() => {
    if (returnTo && returnTo.startsWith("/")) {
      router.push(returnTo);
      return;
    }

    const nextItemId = mode === "edit" ? entry?.itemId : itemIdFromQuery;
    if (nextItemId) {
      router.push(withTenantPath(`${DEPOSIT_ROUTES.items}/${nextItemId}`, tenantSlug));
      return;
    }

    router.push(withTenantPath(DEPOSIT_ROUTES.stock, tenantSlug));
  }, [entry?.itemId, itemIdFromQuery, mode, returnTo, router, tenantSlug]);

  const openCreateDonor = React.useCallback(() => {
    const href = withTenantPath(DEPOSIT_ROUTES.donorsNew, tenantSlug);
    const current = searchParamsString ? `${pathname}?${searchParamsString}` : pathname;
    router.push(`${href}?returnTo=${encodeURIComponent(current)}`);
  }, [pathname, router, searchParamsString, tenantSlug]);

  const openCreateExit = React.useCallback(() => {
    if (!entry?.id || !entry.itemId) return;
    const href = withTenantPath(DEPOSIT_ROUTES.exitsNew, tenantSlug);
    const current = searchParamsString ? `${pathname}?${searchParamsString}` : pathname;
    router.push(
      `${href}?itemId=${encodeURIComponent(entry.itemId)}&entryId=${encodeURIComponent(entry.id)}&returnTo=${encodeURIComponent(current)}`,
    );
  }, [entry?.id, entry?.itemId, pathname, router, searchParamsString, tenantSlug]);

  const openExitDetail = React.useCallback(
    (exitId: string) => {
      const href = withTenantPath(`${DEPOSIT_ROUTES.exits}/${exitId}`, tenantSlug);
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

  const loadEntry = React.useCallback(async () => {
    if (!enabled || mode !== "edit") return;

    setLoading(true);
    try {
      const loaded = await dataProvider.read<ApiDepositEntry>("deposit.entries", id);
      const nextDraft = draftFromEntry(loaded);
      setEntry(loaded);
      setDraft(nextDraft);
      setTags(loaded.tags ?? []);
      setInternalNotes(loaded.internalNotes ?? null);
      replaceSavedDraft(nextDraft);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao carregar entrada.";

      toast({
        variant: "destructive",
        title: "Falha ao carregar",
        description: message,
      });
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [dataProvider, enabled, id, mode, replaceSavedDraft, toast]);

  const loadDonors = React.useCallback(async () => {
    if (!enabled) {
      setDonors([]);
      return;
    }

    setDonorsLoading(true);
    try {
      const response = await dataProvider.search<ApiDepositDonor>("deposit.donors", {
        all: true,
      });
      const rows = response.data ?? [];
      rows.sort((left, right) => String(left.name).localeCompare(String(right.name)));
      setDonors(rows);
    } catch {
      setDonors([]);
    } finally {
      setDonorsLoading(false);
    }
  }, [dataProvider, enabled]);

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

  const loadAllocatedExits = React.useCallback(async () => {
    if (!token || !enabled || mode !== "edit" || !entry?.itemId) {
      setAllocatedExits([]);
      setAllocatedExitRecords([]);
      return;
    }

    setAllocatedExitsLoading(true);
    try {
      const response = await listDepositExits(token, { itemId: entry.itemId, all: true });
      const rows: DepositAllocatedExitRow[] = [];
      const matches: ApiDepositExit[] = [];

      (response.data ?? []).forEach((exitRow) => {
        const allocations = exitRow.allocations ?? [];
        const matchingAllocations = allocations.filter(
          (allocation) => allocation.entryId === entry.id,
        );
        const matchesByEntryIds =
          !matchingAllocations.length &&
          Boolean(exitRow.entryIds?.some((entryId) => entryId === entry.id));

        if (!matchingAllocations.length && !matchesByEntryIds) return;

        const quantity = matchingAllocations.length
          ? matchingAllocations.reduce(
              (sum, allocation) => sum + Number(allocation.quantity || 0),
              0,
            )
          : Number(exitRow.quantity || 0);

        const sectorsSet = new Set<string>();
        if (matchingAllocations.length) {
          matchingAllocations.forEach((allocation) => {
            if (allocation.sector?.trim()) {
              sectorsSet.add(allocation.sector.trim());
            }
          });
        }

        rows.push({
          exitId: exitRow.id,
          exitDate: exitRow.exitDate,
          type: exitRow.type,
          sector: sectorsSet.size
            ? Array.from(sectorsSet).join(", ")
            : exitRow.sector || DEPOSIT_DEFAULT_SECTOR,
          quantity,
          unit: exitRow.unit,
          destinationName: exitRow.destinationName ?? null,
          notes: exitRow.notes ?? null,
        });
        matches.push(exitRow);
      });

      rows.sort((left, right) => String(right.exitDate).localeCompare(String(left.exitDate)));
      matches.sort((left, right) =>
        String(right.exitDate).localeCompare(String(left.exitDate)),
      );
      setAllocatedExits(rows);
      setAllocatedExitRecords(matches);
    } catch {
      setAllocatedExits([]);
      setAllocatedExitRecords([]);
    } finally {
      setAllocatedExitsLoading(false);
    }
  }, [enabled, entry?.id, entry?.itemId, mode, token]);

  React.useEffect(() => {
    void loadItem();
  }, [loadItem]);

  React.useEffect(() => {
    void loadEntry();
  }, [loadEntry]);

  React.useEffect(() => {
    void loadDonors();
  }, [loadDonors]);

  React.useEffect(() => {
    void loadSectors();
  }, [loadSectors]);

  React.useEffect(() => {
    void loadAllocatedExits();
  }, [loadAllocatedExits]);

  const sectorOptions = React.useMemo(() => {
    const values = new Set<string>([DEPOSIT_DEFAULT_SECTOR, ...sectors]);
    if (draft.sector?.trim()) {
      values.add(draft.sector.trim());
    }
    return Array.from(values)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }, [draft.sector, sectors]);

  const createEntry = React.useCallback(async () => {
    if (!enabled || mode !== "create" || !itemIdFromQuery) return;

    if (!canCreate) {
      toast({
        variant: "destructive",
        title: "Sem permissão",
        description: "Você não tem permissão para registrar entradas.",
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
      await dataProvider.create<ApiDepositEntry>("deposit.entries", {
        itemId: itemIdFromQuery,
        donorId: draft.donorId ?? null,
        sector,
        quantity,
        unit,
        entryDate: draft.entryDate.trim() ? draft.entryDate.trim() : undefined,
        expiryDate: null,
        notes: draft.notes.trim() ? draft.notes.trim() : null,
        tags,
        internalNotes,
      });
      toast({ variant: "success", title: "Entrada registrada" });
      close();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao registrar entrada.";

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
      const updated = await dataProvider.update<ApiDepositEntry>("deposit.entries", id, patch);
      setEntry(updated);
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

  const canDelete = React.useMemo(() => {
    if (!entry) return false;
    if (typeof entry.allocatedTotal === "number") return entry.allocatedTotal === 0;
    if (typeof entry.remaining === "number") return entry.remaining === entry.quantity;
    return allocatedExits.length === 0;
  }, [allocatedExits.length, entry]);

  const handleDelete = React.useCallback(async () => {
    if (!entry || !canDeleteAction) return;

    if (!canDelete) {
      toast({
        variant: "destructive",
        title: "Não é possível excluir",
        description: "Esta entrada já teve saídas registradas.",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Excluir entrada?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      confirmVariant: "destructive",
    });

    if (!confirmed) return;

    setBusy(true);
    try {
      await dataProvider.delete("deposit.entries", entry.id);
      toast({ variant: "success", title: "Entrada excluída" });
      close();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao excluir entrada.";

      toast({
        variant: "destructive",
        title: "Falha ao excluir",
        description: message,
      });
    } finally {
      setBusy(false);
    }
  }, [canDelete, canDeleteAction, close, confirm, dataProvider, entry, toast]);

  const donorNameById = React.useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};

    donors.forEach((donor) => {
      if (donor.id && donor.name) {
        next[donor.id] = donor.name;
      }
    });

    if (entry?.donor?.id && entry.donor.name) {
      next[entry.donor.id] = entry.donor.name;
    }

    return next;
  }, [donors, entry?.donor]);

  const exitLabelById = React.useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        allocatedExitRecords.map((exitRow) => [exitRow.id, buildDepositExitAuditLabel(exitRow)]),
      ),
    [allocatedExitRecords],
  );

  const submitComment = React.useCallback(async () => {
    if (!token || mode !== "edit" || !id || !commentDraft.body.trim()) return;
    setCommentSubmitting(true);
    try {
      const updated = await addDepositEntryComment(token, id, {
        body: commentDraft.body.trim(),
        mentionUserIds: commentDraft.mentionUserIds,
      });
      setEntry(updated);
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
      const updated = await deleteDepositEntryComment(token, id, commentId);
      setEntry(updated);
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
        const updated = await addDepositEntryAttachment(token, id, {
          label: uploaded.originalName?.trim() || file.name.trim() || "Anexo",
          filePath: uploaded.path,
          mimeType: uploaded.mimeType ?? file.type ?? null,
          fileSizeBytes: uploaded.size ?? file.size,
        });
        setEntry(updated);
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
      const updated = await deleteDepositEntryAttachment(token, id, attachmentId);
      setEntry(updated);
    },
    [id, mode, token],
  );

  const historyItems = React.useMemo<DepositEntryDetailLayoutContext["historyItems"]>(
    () => {
      const items: DepositEntryDetailLayoutContext["historyItems"] = [];
      if (entry) {
        items.push({
          id: `${entry.id}:created`,
          title: "Entrada criada",
          description: entry.item?.name ?? "Entrada",
          meta: "Criada",
          createdAt: entry.createdAt,
        });
      }
      items.push(
        ...(entry?.comments ?? []).map((comment) => ({
          id: `comment:${comment.id}`,
          title: "Comentário registrado",
          description: comment.body,
          meta: `Por ${comment.author.name}`,
          createdAt: comment.createdAt,
        })),
      );
      items.push(
        ...(entry?.attachments ?? []).map((attachment) => ({
          id: `attachment:${attachment.id}`,
          title: "Anexo adicionado",
          description: attachment.label,
          meta: attachment.sizeLabel ?? attachment.mimeType ?? "Anexo",
          createdAt: attachment.createdAt,
        })),
      );
      return items;
    },
    [entry],
  );

  const headerTitle =
    mode === "create"
      ? item?.name
        ? `Nova entrada de ${item.name}`
        : "Nova entrada"
      : entry
        ? `Entrada - ${formatDateOnlyPtBR(entry.entryDate)}`
        : "Entrada";

  const context = React.useMemo<DepositEntryDetailLayoutContext>(
    () => ({
      mode,
      readOnly,
      saving,
      draft,
      setDraft,
      entry,
      donors,
      donorsLoading,
      sectorsLoading,
      sectorOptions,
      allocatedExitsLoading,
      allocatedExits,
      donorNameById,
      exitLabelById,
      canDelete,
      canCreateRelatedExit,
      onCommitField: (key) => {
        void commitField(key);
      },
      onPatch: (patch) => {
        if (mode === "edit") {
          void commitDraft({ ...draft, ...patch });
        }
      },
      onOpenNewSector: () => setNewSectorOpen(true),
      onOpenCreateDonor: openCreateDonor,
      onOpenCreateExit: openCreateExit,
      onOpenExit: openExitDetail,
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
      allocatedExits,
      allocatedExitsLoading,
      attachmentUploading,
      auditVisibleCount,
      canCreateRelatedExit,
      canDelete,
      commentDraft,
      commentSubmitting,
      commitDraft,
      commitField,
      deleteAttachment,
      deleteComment,
      donorNameById,
      donors,
      donorsLoading,
      draft,
      entry,
      exitLabelById,
      historyItems,
      handleDelete,
      internalNotes,
      mentionableUsers,
      mode,
      openCreateDonor,
      openCreateExit,
      openExitDetail,
      persistMetadata,
      readOnly,
      saving,
      sectorOptions,
      sectorsLoading,
      setDraft,
      submitComment,
      tags,
      uploadAttachment,
    ],
  );

  if (!canAccessPage) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Sem permissão.</div>;
  }

  if (mode === "create" && !itemIdFromQuery) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Informe um item para registrar entrada.
      </div>
    );
  }

  return (
    <>
      <DetailShellEngine<DepositEntryDetailLayoutContext>
        moduleDefinition={depositEntryDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        mode={mode}
        headerTitle={headerTitle}
        saving={saving}
        loading={loading}
        readOnly={readOnly}
        onSave={mode === "create" ? createEntry : undefined}
        onClose={close}
        breadcrumbTitle={headerTitle}
        breadcrumbItems={[
          { label: "Depósito", href: DEPOSIT_ROUTES.stock },
          ...(mode === "edit" && entry?.item?.name
            ? [{ label: entry.item.name, href: `${DEPOSIT_ROUTES.items}/${entry.itemId}` }]
            : mode === "create" && item?.name
              ? [{ label: item.name, href: `${DEPOSIT_ROUTES.items}/${item.id}` }]
              : []),
          ...(mode === "edit" ? [{ label: "Entrada" }] : []),
        ]}
        headerActionsSlot={
          mode === "edit" && canDeleteAction ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving || !canDelete}
              title={
                canDelete
                  ? "Excluir entrada"
                  : "Esta entrada j? teve saídas registradas"
              }
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

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Nome do setor</div>
            <Input
              value={newSectorName}
              onChange={(event) => setNewSectorName(event.target.value)}
              placeholder="Ex: Estoque"
              autoFocus
            />
          </div>

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

export function DepositEntryNewEngineClientPage() {
  return <DepositEntryDetailEngineClientPage mode="create" />;
}

export function DepositEntryEditEngineClientPage() {
  return <DepositEntryDetailEngineClientPage mode="edit" />;
}
