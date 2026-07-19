"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useFamilyRelations } from "@/modules/people/features/family-members/data/use-family-relations";
import {
  FamilyRelationForm,
  type FamilyRelationFormValues,
} from "@/modules/people/features/family-members/ui/family-relation-form";
import type { HouseholdMember, PersonRelation } from "@/modules/people/shared/domain/types";
import {
  buildPeopleFamilyRelationPath,
} from "@/modules/people/shared/domain/people-relation-routes";
import { PeopleRelationDetailShell } from "@/modules/people/shared/ui/people-relation-detail-shell";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import type { AuditFeedConfig, DetailEditingConfig } from "@/web-client/registry/types";

function initialFormValues(
  relation?: PersonRelation | null,
  householdMember?: HouseholdMember | null,
): FamilyRelationFormValues {
  return {
    relatedPersonId: relation?.relatedPersonId ?? householdMember?.personId ?? "",
    type: relation?.type ?? "",
    livesTogether: relation?.livesTogether ?? Boolean(householdMember),
    isLegalGuardian:
      relation?.isLegalGuardian ?? householdMember?.isLegalGuardian ?? false,
    isHouseholdHead: householdMember?.isHouseholdHead ?? false,
    householdRole: householdMember?.role ?? "",
    isIncomeContributor: householdMember?.isIncomeContributor ?? false,
    isProvider: householdMember?.isProvider ?? false,
    isDependent: householdMember?.isDependent ?? false,
    notes: relation?.notes ?? "",
  };
}

const AUTO_EDITING: DetailEditingConfig = {
  saveMode: "auto",
  autoSave: { trigger: "field-commit" },
};

const FAMILY_RELATION_AUDIT_CONFIG: AuditFeedConfig<{ relationId: string }> = {
  primaryEntity: {
    key: "family-relation",
    entity: "PersonRelation",
    model: "audit.logs",
    label: "Vínculo familiar",
    fieldLabels: {
      type: "Tipo de vínculo",
      livesTogether: "Mora junto",
      isLegalGuardian: "Responsável legal",
      isHouseholdHead: "Responsável principal",
      householdRole: "Papel no domicílio",
      isIncomeContributor: "Contribui renda",
      isProvider: "Provedor",
      isDependent: "Dependente",
      notes: "Notas",
    },
    resolveEntityId: ({ relationId }) => relationId,
  },
  filters: { entity: "PersonRelation" },
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { limit: 120 },
};

export function FamilyRelationDetailPage({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string; relationId?: string }>();
  const personId = String(params?.id ?? "");
  const relationId = mode === "edit" ? String(params?.relationId ?? "") : "";
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { data, peopleOptions, detailedLoading, detailedError, create, update } =
    useFamilyRelations(personId, {
      autoLoad: true,
      initialMode: "detailed",
    });

  const current = React.useMemo(
    () => data?.relations.find((item) => item.id === relationId) ?? null,
    [data, relationId],
  );
  const currentMember = React.useMemo(
    () =>
      data?.householdMembers.find(
        (member) => member.personId === current?.relatedPersonId,
      ) ?? null,
    [current, data],
  );
  const createInitialValues = React.useMemo(() => initialFormValues(), []);

  const [draft, setDraft] = React.useState<FamilyRelationFormValues>(createInitialValues);
  const relationIdRef = React.useRef<string | null>(relationId || null);
  const [activeRelationId, setActiveRelationId] = React.useState<string | null>(relationId || null);
  const { saving, replaceSavedDraft, commitDraft } = useDetailAutoSaveController({
    draft,
    enabled: true,
    config: AUTO_EDITING,
    normalizeDraft: (values) => ({
      ...values,
      relatedPersonId: values.relatedPersonId,
      type: values.type.trim(),
      householdRole: values.householdRole.trim(),
      notes: values.notes.trim(),
    }),
    onSave: async (values) => {
      if (!values.relatedPersonId || !values.type.trim()) return values;
      const payload = {
        relatedPersonId: values.relatedPersonId,
        type: values.type.trim(),
        livesTogether: values.livesTogether,
        isLegalGuardian: values.isLegalGuardian,
        isHouseholdHead: values.livesTogether ? values.isHouseholdHead : false,
        householdRole: values.livesTogether ? values.householdRole.trim() || null : null,
        isIncomeContributor: values.livesTogether ? values.isIncomeContributor : false,
        isProvider: values.livesTogether ? values.isProvider : false,
        isDependent: values.livesTogether ? values.isDependent : false,
        notes: values.notes.trim() || null,
      };
      if (!relationIdRef.current) {
        const created = await create(payload);
        if (!created) return values;
        relationIdRef.current = created.id;
        setActiveRelationId(created.id);
        router.replace(
          withTenantPath(buildPeopleFamilyRelationPath(personId, created.id), tenantSlug),
        );
        return initialFormValues(created, null);
      }
      const updated = await update(relationIdRef.current, payload);
      return initialFormValues(updated ?? current, currentMember);
    },
  });

  React.useEffect(() => {
    if (mode !== "edit" || !current) return;
    const nextDraft = initialFormValues(current, currentMember);
    relationIdRef.current = current.id;
    setActiveRelationId(current.id);
    setDraft(nextDraft);
    replaceSavedDraft(nextDraft);
  }, [current, currentMember, mode, replaceSavedDraft]);

  const handleValuesChange = React.useCallback((values: FamilyRelationFormValues) => {
    setDraft(values);
  }, []);

  const handleFieldCommit = React.useCallback(
    (values: FamilyRelationFormValues) => {
      setDraft(values);
      commitDraft(values);
    },
    [commitDraft],
  );

  const handleNotesChange = React.useCallback((next: string | null) => {
    setDraft((previous) => ({ ...previous, notes: next ?? "" }));
  }, []);

  const handleNotesCommit = React.useCallback(
    (next: string | null) => {
      const nextDraft = { ...draft, notes: next ?? "" };
      setDraft(nextDraft);
      commitDraft(nextDraft);
    },
    [commitDraft, draft],
  );

  const relatedPerson = current?.relatedPerson ?? null;
  const relatedPersonHref = relatedPerson
    ? withTenantPath(`/people/${relatedPerson.id}`, tenantSlug)
    : null;

  return (
    <PeopleRelationDetailShell
      personId={personId}
      recordType="family-relation"
      tab="familia"
      title={
        mode === "create"
          ? "Novo vínculo familiar"
          : current?.relatedPerson.fullName ?? "Vínculo familiar"
      }
      mode={mode}
      saving={saving}
      headerActionsSlot={
        relatedPersonHref ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={relatedPersonHref}>
              Abrir pessoa
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        ) : undefined
      }
      relationId={activeRelationId}
      auditConfig={FAMILY_RELATION_AUDIT_CONFIG}
      notes={draft.notes}
      onNotesChange={handleNotesChange}
      onNotesCommit={handleNotesCommit}
    >
      {detailedError ? <div className="text-sm text-destructive">{detailedError}</div> : null}
      {mode === "edit" && detailedLoading && !current ? (
        <div className="text-sm text-muted-foreground">Carregando vínculo...</div>
      ) : null}
      {mode === "edit" && !detailedLoading && !current ? (
        <div className="text-sm text-muted-foreground">Vínculo não encontrado.</div>
      ) : null}
      {mode === "create" || current ? (
        <FamilyRelationForm
          initialValues={mode === "create" ? createInitialValues : initialFormValues(current, currentMember)}
          peopleOptions={peopleOptions}
          disableRelatedPerson={mode === "edit"}
          onValuesChange={handleValuesChange}
          onFieldCommit={handleFieldCommit}
          onSubmit={() => undefined}
        />
      ) : null}
    </PeopleRelationDetailShell>
  );
}
