"use client";

import * as React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useMentionableUsers } from "@/features/auth/use-mentionable-users";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { uploadAvatar, uploadPeopleAttachment } from "@/features/uploads/api";
import { stripApiUrl } from "@/lib/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { getPersonDetentions } from "@/modules/people/api/detentions";
import { getPersonEducations } from "@/modules/people/api/education";
import { getPersonFinancialEntries } from "@/modules/people/api/financial";
import { getPersonHealthConditions } from "@/modules/people/api/health-conditions";
import { getPersonMedications } from "@/modules/people/api/medications";
import {
  addPersonAttachment,
  addPersonComment,
  createPerson,
  deletePersonAttachment,
  deletePersonComment,
  type ApiPerson,
} from "@/modules/people/api";
import { getPersonRelations } from "@/modules/people/api/relations";
import {
  peopleDetailModuleDefinition,
  PEOPLE_ROUTES,
} from "@/modules/people/config/people-module-contract";
import type { PeopleDetailLayoutContext } from "@/modules/people/config/people-detail-layout-contract";
import { mapApiPersonToPerson } from "@/modules/people/shared/domain/people-module.helpers";
import type {
  Person,
  PersonAttachment,
  PersonComment,
  PersonFormData,
} from "@/modules/people/shared/domain/types";
import {
  resolvePersonDisplayNames,
  toDateInputValue,
} from "@/modules/people/shared/domain/utils";
import {
  isPeopleDetailTabValue,
  type PeopleDetailTabValue,
} from "@/modules/people/shared/domain/people-relation-routes";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import {
  resumeDetailAutoSave,
  suspendDetailAutoSave,
} from "@/web-client/detail/detail-media-autosave-guard";
import { useRelatedAuditEntityIds } from "@/web-client/detail/useRelatedAuditEntityIds";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import {
  canUseModuleAction,
  getModuleDetailEditingConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";

const EMPTY_COMMENT_DRAFT = {
  body: "",
  mentionUserIds: [] as string[],
};

const EMPTY_RELATED_AUDIT_ENTITY_IDS = {
  financialEntryIds: [] as string[],
  healthConditionIds: [] as string[],
  medicationIds: [] as string[],
  educationIds: [] as string[],
  detentionIds: [] as string[],
  relationIds: [] as string[],
};

function buildPersonDraft(person: Person): PersonFormData {
  return {
    fullName: person.fullName,
    socialName: person.socialName ?? "",
    email: person.email ?? "",
    phone: person.phone ?? "",
    birthDate: toDateInputValue(person.birthDate),
    sex: person.sex ?? null,
    personType: person.personType ?? null,
    gender: person.gender ?? null,
    raceColor: person.raceColor ?? null,
    maritalStatus: person.maritalStatus ?? null,
    nationality: person.nationality ?? "",
    status: person.status ?? null,
    departureReason: person.departureReason ?? "",
    notes: person.notes ?? "",
    tags: person.tags ?? [],
    profileSummary: person.profileSummary ?? "",
    avatarUrl: person.avatarUrl ?? null,
  };
}

function buildEmptyPersonDraft(): PersonFormData {
  return {
    fullName: "",
    socialName: "",
    email: "",
    phone: "",
    birthDate: null,
    sex: null,
    personType: null,
    gender: null,
    raceColor: null,
    maritalStatus: null,
    nationality: "",
    status: "Ativo",
    departureReason: "",
    notes: "",
    tags: [],
    profileSummary: "",
    avatarUrl: null,
  };
}

function buildDraftPerson(draft: PersonFormData): Person {
  const normalized = normalizePersonDraft(draft);
  return {
    id: "new",
    fullName: normalized.fullName || "Nova pessoa",
    socialName: normalized.socialName ?? null,
    email: normalized.email ?? null,
    phone: normalized.phone ?? null,
    birthDate: normalized.birthDate ?? null,
    sex: normalized.sex ?? null,
    gender: normalized.gender ?? null,
    raceColor: normalized.raceColor ?? null,
    maritalStatus: normalized.maritalStatus ?? null,
    nationality: normalized.nationality ?? null,
    status: normalized.status ?? null,
    personType: normalized.personType ?? null,
    departureReason: normalized.departureReason ?? null,
    notes: normalized.notes ?? null,
    tags: normalized.tags ?? [],
    profileSummary: normalized.profileSummary ?? null,
    avatarUrl:
      typeof normalized.avatarUrl === "string" ? normalized.avatarUrl : null,
    comments: [],
    attachments: [],
    hasHealthCondition: false,
    hasMedication: false,
    createdAt: null,
    updatedAt: null,
  };
}

function normalizePersonDraft(draft: PersonFormData): PersonFormData {
  return {
    ...draft,
    fullName: draft.fullName.trim(),
    socialName: draft.socialName?.trim() || null,
    email: draft.email?.trim() || null,
    phone: draft.phone?.trim() || null,
    birthDate: draft.birthDate || null,
    sex: draft.sex || null,
    personType: draft.personType || null,
    gender: draft.gender || null,
    raceColor: draft.raceColor || null,
    maritalStatus: draft.maritalStatus || null,
    nationality: draft.nationality?.trim() || null,
    status: draft.status || null,
    departureReason: draft.departureReason?.trim() || null,
    notes: draft.notes?.trim() || null,
    tags: Array.from(new Set((draft.tags ?? []).map((tag) => tag.trim()).filter(Boolean))),
    profileSummary: draft.profileSummary ?? "",
    avatarUrl:
      draft.avatarUrl instanceof File
        ? draft.avatarUrl
        : typeof draft.avatarUrl === "string"
          ? draft.avatarUrl.trim() || null
          : null,
  };
}

export function PeopleDetailEngineClientPage({
  mode: modeProp,
}: {
  mode?: "create" | "edit";
} = {}) {
  const params = useParams<{ id?: string }>();
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const routeMode =
    params?.id === "new" || pathname.endsWith("/people/new") ? "create" : "edit";
  const mode = modeProp ?? routeMode;
  const isEdit = mode === "edit";

  const canRead = hasModulePermission(
    peopleDetailModuleDefinition,
    "canRead",
    permissions,
  );
  const canUpdate = canUseModuleAction(
    peopleDetailModuleDefinition,
    "edit",
    permissions,
  );
  const canCreate = canUseModuleAction(
    peopleDetailModuleDefinition,
    "create",
    permissions,
  );
  const canAudit = canUseModuleAction(
    peopleDetailModuleDefinition,
    "audit",
    permissions,
  );
  const { users: mentionableUsers } = useMentionableUsers("people.read");

  const id = params?.id ? String(params.id) : "";
  const canAccessPage = mode === "create" ? canCreate : canRead;
  const enabled = Boolean(token && canRead && id && isEdit);
  const dataProvider = React.useMemo(
    () => createRestDataProvider({ token }),
    [token],
  );

  const [person, setPerson] = React.useState<Person | null>(
    isEdit ? null : buildDraftPerson(buildEmptyPersonDraft()),
  );
  const [draft, setDraft] = React.useState<PersonFormData | null>(
    isEdit ? null : buildEmptyPersonDraft(),
  );
  const [loading, setLoading] = React.useState(isEdit);
  const [saving, setSaving] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initialTab = React.useMemo<PeopleDetailTabValue>(() => {
    const tab = searchParams.get("tab");
    return isPeopleDetailTabValue(tab) && tab !== "atendimentos"
      ? tab
      : "familia";
  }, [searchParams]);
  const [tabValue, setTabValue] = React.useState<PeopleDetailTabValue>(initialTab);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);
  const [commentDraft, setCommentDraft] = React.useState(EMPTY_COMMENT_DRAFT);
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const draftStateRef = React.useRef<PersonFormData | null>(null);
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    draftStateRef.current = draft;
  }, [draft]);

  React.useEffect(() => {
    setAuditVisibleCount(24);
    setCommentDraft(EMPTY_COMMENT_DRAFT);
  }, [id, mode]);

  React.useEffect(() => {
    setTabValue(initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    if (isEdit) return;
    const nextDraft = buildEmptyPersonDraft();
    setDraft(nextDraft);
    setPerson(buildDraftPerson(nextDraft));
    draftStateRef.current = nextDraft;
    setLoading(false);
    setError(null);
  }, [isEdit]);

  const handleTabChange = React.useCallback(
    (nextValue: PeopleDetailTabValue) => {
      setTabValue(nextValue);
      const nextSearch = new URLSearchParams(searchParams.toString());
      if (nextValue === "familia") {
        nextSearch.delete("tab");
      } else {
        nextSearch.set("tab", nextValue);
      }
      const nextQuery = nextSearch.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const persistDraft = React.useCallback(
    async (nextDraft: PersonFormData) => {
      if (!token || !person || !canUpdate) return nextDraft;
      if (nextDraft.status === "Desligado" && !nextDraft.departureReason?.trim()) {
        throw new Error("Informe o motivo do desligamento.");
      }

      setSaving(true);
      setError(null);
      try {
        const normalized = normalizePersonDraft(nextDraft);
        let avatarUrl: string | null;

        if (normalized.avatarUrl instanceof File) {
          avatarUrl = (await uploadAvatar(token, normalized.avatarUrl)).path;
        } else if (typeof normalized.avatarUrl === "string") {
          avatarUrl = normalized.avatarUrl ? stripApiUrl(normalized.avatarUrl) : null;
        } else {
          avatarUrl = null;
        }

        const updated = await dataProvider.update<ApiPerson>(
          peopleDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "people.detail",
          person.id,
          {
            fullName: normalized.fullName,
            socialName: normalized.socialName,
            email: normalized.email,
            phone: normalized.phone,
            birthDate: normalized.birthDate,
            sex: normalized.sex,
            personType: normalized.personType,
            gender: normalized.gender,
            raceColor: normalized.raceColor,
            maritalStatus: normalized.maritalStatus,
            nationality: normalized.nationality,
            status: normalized.status,
            departureReason: normalized.departureReason,
            notes: normalized.notes,
            tags: normalized.tags ?? [],
            profileSummary: normalized.profileSummary || null,
            avatarUrl,
          },
        );

        const nextPerson = mapApiPersonToPerson(updated);
        const savedDraft = buildPersonDraft(nextPerson);
        setPerson(nextPerson);
        setDraft(savedDraft);
        return savedDraft;
      } catch (nextError) {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao salvar pessoa.";
        setError(message);
        throw nextError;
      } finally {
        setSaving(false);
      }
    },
    [canUpdate, dataProvider, person, token],
  );

  const autoSave = useDetailAutoSaveController<PersonFormData>({
    draft,
    enabled: isEdit && Boolean(person) && canUpdate && Boolean(token),
    config: getModuleDetailEditingConfig(peopleDetailModuleDefinition),
    normalizeDraft: normalizePersonDraft,
    onSave: persistDraft,
    onError: (nextError) => {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao salvar pessoa.";
      setError(message);
    },
  });
  const { replaceSavedDraft, commitDraft } = autoSave;

  const loadPerson = React.useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await dataProvider.read<ApiPerson>(
        peopleDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "people.detail",
        id,
      );
      const nextPerson = mapApiPersonToPerson(response);
      const nextDraft = buildPersonDraft(nextPerson);
      setPerson(nextPerson);
      setDraft(nextDraft);
      replaceSavedDraft(nextDraft);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar pessoa.";
      setPerson(null);
      setDraft(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dataProvider, enabled, id, replaceSavedDraft]);

  React.useEffect(() => {
    if (!isEdit) return;
    void loadPerson();
  }, [isEdit, loadPerson]);

  const loadRelatedAuditEntityIds = React.useCallback(async () => {
    if (!token || !person?.id) {
      return EMPTY_RELATED_AUDIT_ENTITY_IDS;
    }

    const [
      financialEntries,
      healthConditions,
      medications,
      educations,
      detentions,
      relations,
    ] = await Promise.all([
      getPersonFinancialEntries(token, person.id),
      getPersonHealthConditions(token, person.id),
      getPersonMedications(token, person.id),
      getPersonEducations(token, person.id),
      getPersonDetentions(token, person.id),
      getPersonRelations(token, person.id),
    ]);

    return {
      financialEntryIds: financialEntries.map((item) => item.id),
      healthConditionIds: healthConditions.map((item) => item.id),
      medicationIds: medications.map((item) => item.id),
      educationIds: educations.map((item) => item.id),
      detentionIds: detentions.map((item) => item.id),
      relationIds: relations.relations.map((item) => item.id),
    };
  }, [person?.id, token]);

  const relatedAuditEntityIds = useRelatedAuditEntityIds({
    enabled: Boolean(token && isEdit && person?.id),
    emptyValue: EMPTY_RELATED_AUDIT_ENTITY_IDS,
    load: loadRelatedAuditEntityIds,
  });

  const backToList = React.useCallback(() => {
    router.push(withTenantPath(PEOPLE_ROUTES.list, tenantSlug));
  }, [router, tenantSlug]);

  const handleAvatarUpdate = React.useCallback(
    async (file: File) => {
      if (!draftStateRef.current) return;
      setAvatarUploading(true);
      const nextDraft = { ...draftStateRef.current, avatarUrl: file };
      setDraft(nextDraft);
      draftStateRef.current = nextDraft;
      try {
        if (isEdit && canUpdate) {
          await Promise.resolve(commitDraft(nextDraft));
        } else {
          setPerson(buildDraftPerson(nextDraft));
        }
      } finally {
        setAvatarUploading(false);
      }
    },
    [canUpdate, commitDraft, isEdit],
  );

  const refreshFromPerson = React.useCallback(
    (updated: ApiPerson, replaceSavedDraft: (nextDraft: PersonFormData | null) => void) => {
      const nextPerson = mapApiPersonToPerson(updated);
      const nextDraft = buildPersonDraft(nextPerson);
      setPerson(nextPerson);
      setDraft(nextDraft);
      replaceSavedDraft(nextDraft);
      draftStateRef.current = nextDraft;
    },
    [],
  );

  const tagSuggestions = React.useMemo(
    () => Array.from(new Set((person?.tags ?? []).map((tag) => tag.trim()).filter(Boolean))),
    [person?.tags],
  );

  const displayNames = React.useMemo(
    () =>
      person
        ? resolvePersonDisplayNames(person.fullName, person.socialName)
        : { primary: "Pessoa", secondary: null },
    [person],
  );

  const handleDraftChange = React.useCallback<
    React.Dispatch<React.SetStateAction<PersonFormData>>
  >((next) => {
    setDraft((previous) => {
      if (!previous) return previous;
      const resolved =
        typeof next === "function"
          ? (next as (prev: PersonFormData) => PersonFormData)(previous)
          : next;
      if (!isEdit) {
        setPerson(buildDraftPerson(resolved));
      }
      draftStateRef.current = resolved;
      return resolved;
    });
  }, [isEdit]);

  const handleCommitField = React.useCallback<
    <K extends keyof PersonFormData>(
      field: K,
      nextValue?: PersonFormData[K],
    ) => void
  >(
    (field, nextValue) => {
      const currentDraft = draftStateRef.current;
      if (!currentDraft) return;
      const nextDraft =
        typeof nextValue === "undefined"
          ? currentDraft
          : ({ ...currentDraft, [field]: nextValue } as PersonFormData);
      setDraft(nextDraft);
      draftStateRef.current = nextDraft;
      commitDraft(nextDraft);
    },
    [commitDraft],
  );

  const handleCommitDraft = React.useCallback(
    (nextDraft: PersonFormData) => {
      setDraft(nextDraft);
      draftStateRef.current = nextDraft;
      commitDraft(nextDraft);
    },
    [commitDraft],
  );

  const handleCreate = React.useCallback(async () => {
    if (!token || !canCreate || !draft) return;
    const normalized = normalizePersonDraft(draft);
    if (!normalized.fullName) {
      toast({
        variant: "destructive",
        title: "Dados invalidos",
        description: "Informe o nome da pessoa.",
      });
      return;
    }
    if (normalized.status === "Desligado" && !normalized.departureReason?.trim()) {
      toast({
        variant: "destructive",
        title: "Dados invalidos",
        description: "Informe o motivo do desligamento.",
      });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let avatarUrl: string | null;
      if (normalized.avatarUrl instanceof File) {
        avatarUrl = (await uploadAvatar(token, normalized.avatarUrl)).path;
      } else if (typeof normalized.avatarUrl === "string") {
        avatarUrl = normalized.avatarUrl ? stripApiUrl(normalized.avatarUrl) : null;
      } else {
        avatarUrl = null;
      }

      const created = await createPerson(token, {
        fullName: normalized.fullName,
        socialName: normalized.socialName,
        email: normalized.email,
        phone: normalized.phone,
        birthDate: normalized.birthDate,
        sex: normalized.sex,
        personType: normalized.personType,
        gender: normalized.gender,
        raceColor: normalized.raceColor,
        maritalStatus: normalized.maritalStatus,
        nationality: normalized.nationality,
        status: normalized.status,
        departureReason: normalized.departureReason,
        notes: normalized.notes,
        tags: normalized.tags ?? [],
        profileSummary: normalized.profileSummary || null,
        avatarUrl,
      });
      toast({ variant: "success", title: "Pessoa criada" });
      router.replace(withTenantPath(`${PEOPLE_ROUTES.detail}/${created.id}`, tenantSlug));
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao criar pessoa.";
      setError(message);
      toast({ variant: "destructive", title: "Falha ao criar", description: message });
    } finally {
      setSaving(false);
    }
  }, [canCreate, draft, router, tenantSlug, toast, token]);

  const handleSubmitComment = React.useCallback(async () => {
    if (!token || !person || !commentDraft.body.trim()) return;
    setCommentSubmitting(true);
    setError(null);
    try {
      const updated = await addPersonComment(token, person.id, commentDraft);
      refreshFromPerson(updated, replaceSavedDraft);
      setCommentDraft(EMPTY_COMMENT_DRAFT);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao comentar na pessoa.";
      setError(message);
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft, person, refreshFromPerson, replaceSavedDraft, token]);

  const handleDeleteComment = React.useCallback(
    async (comment: PersonComment) => {
      if (!token || !person) return;
      if (!window.confirm("Excluir este comentario?")) return;
      setCommentSubmitting(true);
      setError(null);
      try {
        const updated = await deletePersonComment(token, person.id, comment.id);
        refreshFromPerson(updated, replaceSavedDraft);
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
    [person, refreshFromPerson, replaceSavedDraft, token],
  );

  const handleSelectAttachment = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !token || !person) {
        resumeDetailAutoSave();
        return;
      }

      setAttachmentUploading(true);
      setError(null);
      try {
        const uploaded = await uploadPeopleAttachment(token, file);
        const updated = await addPersonAttachment(token, person.id, {
          label: uploaded.originalName?.trim() || file.name.trim() || "Anexo",
          filePath: uploaded.path,
          mimeType: uploaded.mimeType ?? file.type ?? null,
          fileSizeBytes: uploaded.size ?? file.size,
        });
        refreshFromPerson(updated, replaceSavedDraft);
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
    [person, refreshFromPerson, replaceSavedDraft, token],
  );

  const handleDeleteAttachment = React.useCallback(
    async (attachment: PersonAttachment) => {
      if (!token || !person) return;
      if (!window.confirm(`Excluir o anexo "${attachment.label}"?`)) return;
      setAttachmentUploading(true);
      setError(null);
      try {
        const updated = await deletePersonAttachment(token, person.id, attachment.id);
        refreshFromPerson(updated, replaceSavedDraft);
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
    [person, refreshFromPerson, replaceSavedDraft, token],
  );

  const context = React.useMemo<PeopleDetailLayoutContext | null>(
    () =>
      person && draft
        ? {
            mode,
            person,
            draft,
            readOnly: mode === "create" ? !canCreate : !canUpdate,
            avatarUploading,
            canAudit: mode === "edit" && canAudit,
            mentionableUsers,
            relatedAuditEntityIds,
            tagSuggestions,
            onAvatarFileSelect:
              mode === "create"
                ? (file) => handleAvatarUpdate(file)
                : canUpdate
                  ? (file) => handleAvatarUpdate(file)
                  : undefined,
            onDraftChange: handleDraftChange,
            onCommitField: handleCommitField,
            onCommitDraft: handleCommitDraft,
            tabValue,
            onTabChange: handleTabChange,
            auditVisibleCount,
            onAuditVisibleCountChange: setAuditVisibleCount,
            commentDraft,
            commentSubmitting,
            attachmentUploading,
            onCommentDraftChange: setCommentDraft,
            onSubmitComment: handleSubmitComment,
            onDeleteComment: handleDeleteComment,
            onUploadAttachment: () => {
              if (!canUpdate || mode !== "edit") return;
              suspendDetailAutoSave();
              attachmentInputRef.current?.click();
            },
            onDeleteAttachment: handleDeleteAttachment,
          }
        : null,
    [
      person,
      draft,
      mode,
      canCreate,
      canUpdate,
      avatarUploading,
      canAudit,
      mentionableUsers,
      relatedAuditEntityIds,
      tagSuggestions,
      handleAvatarUpdate,
      handleDraftChange,
      handleCommitField,
      handleCommitDraft,
      tabValue,
      auditVisibleCount,
      handleTabChange,
      commentDraft,
      commentSubmitting,
      attachmentUploading,
      handleSubmitComment,
      handleDeleteComment,
      handleDeleteAttachment,
    ],
  );

  if (!canAccessPage) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Voce nao tem permissao para acessar esta area.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Carregando pessoa...
      </div>
    );
  }

  if (error && !person) {
    return <div className="px-4 py-6 text-sm text-destructive">{error}</div>;
  }

  if (!person || !context) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Pessoa nao encontrada.
      </div>
    );
  }

  return (
    <>
      <input
        ref={attachmentInputRef}
        type="file"
        className="hidden"
        onChange={handleSelectAttachment}
      />
      {error ? (
        <div className="px-4 pt-4 text-sm text-destructive">{error}</div>
      ) : null}

      <DetailShellEngine<PeopleDetailLayoutContext>
        moduleDefinition={peopleDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={mode === "edit" && canAudit}
        mode={mode}
        headerTitle={displayNames.primary}
        saving={saving || avatarUploading || attachmentUploading || commentSubmitting}
        loading={loading}
        readOnly={context.readOnly}
        onSave={mode === "create" ? handleCreate : undefined}
        onClose={backToList}
        breadcrumbTitle={displayNames.primary}
        breadcrumbItems={[
          { label: "Pessoas", href: PEOPLE_ROUTES.list },
          ...(mode === "edit" ? [{ label: displayNames.primary }] : []),
        ]}
        headerActionsSlot={null}
      />
    </>
  );
}
