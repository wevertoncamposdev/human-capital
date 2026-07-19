"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useRegisterUsageDocumentation } from "@/components/UsageDocumentation/UsageDocumentationProvider";
import { buildUsageDocumentationItems } from "@/components/UsageDocumentation/usage-documentation.helpers";
import { useConfirm } from "@/components/confirm/use-confirm";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import type {
  ApiPeopleSegment,
  ApiPeopleSegmentMembership,
} from "@/modules/people-segments/api";
import {
  createPeopleSegmentMembership,
  endPeopleSegmentMembership,
  listPeopleSegmentMemberships,
} from "@/modules/people-segments/api";
import {
  PEOPLE_SEGMENTS_ROUTES,
  peopleSegmentsDetailModuleDefinition,
} from "@/modules/people-segments/config/people-segments-module-contract";
import { PEOPLE_SEGMENT_USAGE_TEXT } from "@/modules/people-segments/shared/domain/people-segments.constants";
import {
  type PeopleSegmentDetailDraft,
  type PeopleSegmentsDetailLayoutContext,
} from "@/modules/people-segments/config/people-segments-detail-layout-contract";
import { PeopleSegmentPeoplePickerDialog } from "@/modules/people-segments/features/detail/ui/people-segment-people-picker-dialog";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import {
  canUseModuleAction,
  getModuleDetailEditingConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";

function buildDraft(segment?: ApiPeopleSegment | null): PeopleSegmentDetailDraft {
  return {
    name: segment?.name ?? "",
    purpose: segment?.purpose ?? "PUBLICO",
    category: segment?.category ?? "",
    description: segment?.description ?? "",
    ageMin: segment?.ageMin != null ? String(segment.ageMin) : "",
    ageMax: segment?.ageMax != null ? String(segment.ageMax) : "",
    isActive: segment?.isActive ?? true,
    internalNotes: segment?.internalNotes ?? null,
  };
}

function normalizeDraft(draft: PeopleSegmentDetailDraft): PeopleSegmentDetailDraft {
  return {
    name: draft.name.trim(),
    purpose: draft.purpose,
    category: draft.category.trim(),
    description: draft.description.trim(),
    ageMin: draft.ageMin.trim(),
    ageMax: draft.ageMax.trim(),
    isActive: draft.isActive,
    internalNotes: draft.internalNotes?.trim() ? draft.internalNotes.trim() : null,
  };
}

function toPayload(draft: PeopleSegmentDetailDraft) {
  const normalized = normalizeDraft(draft);
  return {
    name: normalized.name,
    purpose: normalized.purpose,
    category: normalized.category || null,
    description: normalized.description || null,
    ageMin: normalized.ageMin ? Number(normalized.ageMin) : null,
    ageMax: normalized.ageMax ? Number(normalized.ageMax) : null,
    isActive: normalized.isActive,
    internalNotes: normalized.internalNotes,
  };
}

export function PeopleSegmentsDetailEngineClientPage() {
  const params = useParams<{ id?: string }>();
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname) ?? "";

  const id = params?.id ? String(params.id) : "";
  const mode = id === "new" || pathname.endsWith("/people-groups/new") ? "create" : "edit";
  const isEdit = mode === "edit";

  const canRead = hasModulePermission(peopleSegmentsDetailModuleDefinition, "canRead", permissions);
  const canCreate = canUseModuleAction(peopleSegmentsDetailModuleDefinition, "create", permissions);
  const canEdit = canUseModuleAction(peopleSegmentsDetailModuleDefinition, "edit", permissions);
  const canAudit = canUseModuleAction(peopleSegmentsDetailModuleDefinition, "audit", permissions);

  const canAccessPage = mode === "create" ? canCreate : canRead;
  const canManageMemberships = canEdit;
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const [segment, setSegment] = React.useState<ApiPeopleSegment | null>(null);
  const [draft, setDraft] = React.useState<PeopleSegmentDetailDraft>(buildDraft());
  const [memberships, setMemberships] = React.useState<ApiPeopleSegmentMembership[]>([]);
  const [historyMemberships, setHistoryMemberships] = React.useState<ApiPeopleSegmentMembership[]>([]);
  const [loading, setLoading] = React.useState(isEdit);
  const [membershipsLoading, setMembershipsLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);

  const usageItems = React.useMemo(
    () => buildUsageDocumentationItems("people-segments-detail", PEOPLE_SEGMENT_USAGE_TEXT.detail.sections),
    [],
  );

  useRegisterUsageDocumentation({
    title: PEOPLE_SEGMENT_USAGE_TEXT.detail.title,
    items: usageItems,
  });

  const loadMemberships = React.useCallback(async () => {
    if (!token || !isEdit || !id || !canRead) {
      setMemberships([]);
      setHistoryMemberships([]);
      return;
    }
    setMembershipsLoading(true);
    try {
      const response = await listPeopleSegmentMemberships(token, id, {
        page: 1,
        limit: 200,
        all: true,
      });
      const active = response.data.filter((membership) => membership.isActive && !membership.deletedAt);
      const history = response.data.filter((membership) => !membership.isActive || Boolean(membership.deletedAt));
      setMemberships(active);
      setHistoryMemberships(history);
    } catch {
      setMemberships([]);
      setHistoryMemberships([]);
    } finally {
      setMembershipsLoading(false);
    }
  }, [canRead, id, isEdit, token]);

  const persistDraft = React.useCallback(
    async (nextDraft: PeopleSegmentDetailDraft) => {
      const updated = await dataProvider.update<ApiPeopleSegment>(
        peopleSegmentsDetailModuleDefinition.queryAdapters.detailDataProvider?.model ??
          "people-segments.detail",
        id,
        toPayload(nextDraft),
      );
      const savedDraft = buildDraft(updated);
      setSegment(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [dataProvider, id],
  );

  const autoSave = useDetailAutoSaveController<PeopleSegmentDetailDraft>({
    draft,
    enabled: isEdit && canEdit,
    config: getModuleDetailEditingConfig(peopleSegmentsDetailModuleDefinition),
    normalizeDraft,
    onSave: persistDraft,
    onError: (error) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao salvar grupo de pessoas.";
      toast({ variant: "destructive", title: "Falha ao salvar", description: message });
    },
  });
  const { saving: autoSaving, replaceSavedDraft, commitField } = autoSave;
  const saving = busy || autoSaving;

  React.useEffect(() => {
    setAuditVisibleCount(24);
  }, [id, mode]);

  React.useEffect(() => {
    if (!token || !canAccessPage || !isEdit || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    dataProvider
      .read<ApiPeopleSegment>("people-segments.detail", id)
      .then((loaded) => {
        const nextDraft = buildDraft(loaded);
        setSegment(loaded);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      })
      .catch((error) => {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
          : "Falha ao carregar grupo de pessoas.";
        toast({ variant: "destructive", title: "Falha ao carregar", description: message });
      })
      .finally(() => setLoading(false));
  }, [canAccessPage, dataProvider, id, isEdit, replaceSavedDraft, toast, token]);

  React.useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  const handleCreate = React.useCallback(async () => {
    if (!canCreate) return;
    const payload = toPayload(draft);
    if (!payload.name) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: "Informe o nome do grupo de pessoas.",
      });
      return;
    }

    setBusy(true);
    try {
      const created = await dataProvider.create<ApiPeopleSegment>(
        "people-segments.detail",
        payload,
      );
      toast({ variant: "success", title: "Grupo de pessoas criado" });
      router.replace(withTenantPath(`${PEOPLE_SEGMENTS_ROUTES.detail}/${created.id}`, tenantSlug));
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao criar grupo de pessoas.";
      toast({ variant: "destructive", title: "Falha ao criar", description: message });
    } finally {
      setBusy(false);
    }
  }, [canCreate, dataProvider, draft, router, tenantSlug, toast]);

  const handleCreateMembership = React.useCallback(() => {
    setPickerOpen(true);
  }, []);

  const handlePickPerson = React.useCallback(
    async (person: { id: string; fullName: string }) => {
      if (!token || !id) return;
      try {
        await createPeopleSegmentMembership(token, id, { personId: person.id });
        toast({ title: "Participante adicionado" });
        await loadMemberships();
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao adicionar participante ao grupo.";
        toast({ variant: "destructive", title: "Falha ao adicionar", description: message });
      }
    },
    [id, loadMemberships, toast, token],
  );

  const handleBulkPickPeople = React.useCallback(
    async (people: Array<{ id: string; fullName: string }>) => {
      if (!token || !id || people.length === 0) return;

      let added = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const person of people) {
        try {
          await createPeopleSegmentMembership(token, id, { personId: person.id });
          added += 1;
        } catch (error) {
          failed += 1;
          const message =
            error && typeof error === "object" && "message" in error
              ? String((error as { message?: string }).message)
              : "Falha ao adicionar participante ao grupo.";
          errors.push(`${person.fullName}: ${message}`);
        }
      }

      if (added > 0 || failed === 0) {
        toast({
          title: added === 1 ? "Participante adicionado" : "Participantes adicionados",
          description:
            failed > 0
              ? `${added} adicionados e ${failed} com erro.`
              : `${added} adicionados.`,
          variant: failed > 0 ? "destructive" : "default",
        });
      }

      if (failed > 0 && added === 0) {
        toast({
          variant: "destructive",
          title: "Falha ao adicionar",
          description: errors.slice(0, 3).join(" | "),
        });
      }

      await loadMemberships();
    },
    [id, loadMemberships, toast, token],
  );

  const handleEndMembership = React.useCallback(
    async (membership: ApiPeopleSegmentMembership) => {
      if (!token || !id || !canManageMemberships) return;
      const confirmed = await confirm({
        title: "Encerrar vínculo",
        description: `Encerrar o vínculo de "${membership.person.fullName}" com este grupo de pessoas preservando o histórico?`,
        confirmLabel: "Encerrar",
        cancelLabel: "Cancelar",
        confirmVariant: "destructive",
      });
      if (!confirmed) return;
      try {
        await endPeopleSegmentMembership(token, id, membership.id);
        toast({ title: "Vínculo encerrado" });
        await loadMemberships();
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao encerrar vínculo.";
        toast({ variant: "destructive", title: "Falha ao encerrar", description: message });
      }
    },
    [canManageMemberships, confirm, id, loadMemberships, toast, token],
  );

  const context = React.useMemo<PeopleSegmentsDetailLayoutContext>(
    () => ({
      mode,
      readOnly: mode === "create" ? !canCreate : !canEdit,
      canAudit,
      canEdit,
      canManageMemberships,
      tenantSlug,
      segment,
      draft,
      setDraft,
      memberships,
      historyMemberships,
      membershipsLoading,
      onCommitField: (field, nextValue) => void commitField(field, nextValue),
      onNotesChange: (next) => setDraft((previous) => ({ ...previous, internalNotes: next })),
      onNotesBlur: () => void commitField("internalNotes"),
      onOpenPerson: (personId) => router.push(withTenantPath(`/people/${personId}`, tenantSlug)),
      onCreateMembership: handleCreateMembership,
      onEndMembership: handleEndMembership,
      auditVisibleCount,
      onAuditVisibleCountChange: setAuditVisibleCount,
    }),
    [
      auditVisibleCount,
      canAudit,
      canCreate,
      canEdit,
      canManageMemberships,
      commitField,
      draft,
      handleCreateMembership,
      handleEndMembership,
      memberships,
      historyMemberships,
      membershipsLoading,
      mode,
      router,
      segment,
      tenantSlug,
    ],
  );

  if (!canAccessPage) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Sem permissão.</div>;
  }

  const headerTitle =
    mode === "create"
      ? "Novo grupo de pessoas"
      : segment?.name || draft.name || "Grupo de Pessoas";

  return (
    <>
      <DetailShellEngine<PeopleSegmentsDetailLayoutContext>
        moduleDefinition={peopleSegmentsDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={canAudit}
        mode={mode}
        headerTitle={headerTitle}
        saving={saving}
        loading={loading}
        readOnly={context.readOnly}
        onSave={mode === "create" ? handleCreate : undefined}
        onClose={() => router.push(withTenantPath(PEOPLE_SEGMENTS_ROUTES.list, tenantSlug))}
        breadcrumbTitle={headerTitle}
        breadcrumbItems={[
          { label: "Grupos de Pessoas", href: PEOPLE_SEGMENTS_ROUTES.list },
          ...(mode === "edit" ? [{ label: headerTitle }] : []),
        ]}
      />
      {mode === "edit" && token ? (
        <PeopleSegmentPeoplePickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={handlePickPerson}
          onBulkPick={handleBulkPickPeople}
        />
      ) : null}
    </>
  );
}
