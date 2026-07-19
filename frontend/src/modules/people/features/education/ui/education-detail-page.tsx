"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useEducation } from "@/modules/people/features/education/data/use-education";
import {
  EducationForm,
  type EducationFormValues,
} from "@/modules/people/features/education/ui/education-form";
import type { EducationRecord } from "@/modules/people/shared/domain/types";
import {
  buildPeopleDetailTabPath,
  buildPeopleEducationPath,
} from "@/modules/people/shared/domain/people-relation-routes";
import { PeopleRelationDetailShell } from "@/modules/people/shared/ui/people-relation-detail-shell";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import type { AuditFeedConfig, DetailEditingConfig } from "@/web-client/registry/types";

function initialFormValues(item?: EducationRecord): EducationFormValues {
  return {
    level: item?.level ?? "",
    status: item?.status ?? "",
    institution: item?.institution ?? "",
    grade: item?.grade ?? "",
    schoolYear: item?.schoolYear ?? "",
    isCurrent: item?.isCurrent ?? true,
    startDate: item?.startDate?.slice(0, 10) ?? "",
    endDate: item?.endDate?.slice(0, 10) ?? "",
    notes: item?.notes ?? "",
  };
}

const AUTO_EDITING: DetailEditingConfig = {
  saveMode: "auto",
  autoSave: { trigger: "field-commit" },
};

const EDUCATION_AUDIT_CONFIG: AuditFeedConfig<{ relationId: string }> = {
  primaryEntity: {
    key: "education",
    entity: "PersonEducation",
    model: "audit.logs",
    label: "Escolaridade",
    fieldLabels: {
      level: "Nivel",
      status: "Status",
      institution: "Instituicao",
      grade: "Turma/Serie",
      schoolYear: "Ano letivo",
      isCurrent: "Registro atual",
      startDate: "Inicio",
      endDate: "Fim",
      notes: "Notas",
    },
    valueFormatters: {
      isCurrent: (value) => (value ? "Sim" : "Nao"),
    },
    resolveEntityId: ({ relationId }) => relationId,
  },
  filters: { entity: "PersonEducation" },
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { limit: 120 },
};

function normalizeDraft(values: EducationFormValues): EducationFormValues {
  return {
    ...values,
    level: values.level.trim(),
    status: values.status.trim(),
    institution: values.institution.trim(),
    grade: values.grade.trim(),
    schoolYear: values.schoolYear.trim(),
    startDate: values.startDate || "",
    endDate: values.endDate || "",
    notes: values.notes.trim(),
  };
}

export function EducationDetailPage({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string; educationId?: string }>();
  const personId = String(params?.id ?? "");
  const educationId = mode === "edit" ? String(params?.educationId ?? "") : "";
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { educations, isLoading, error, create, update } = useEducation(personId, {
    enabled: Boolean(personId),
  });
  const createInitialValues = React.useMemo(() => initialFormValues(), []);

  const current = React.useMemo(
    () => educations.find((item) => item.id === educationId) ?? null,
    [educationId, educations],
  );
  const backHref = withTenantPath(
    buildPeopleDetailTabPath(personId, "escolaridade"),
    tenantSlug,
  );

  const [draft, setDraft] = React.useState<EducationFormValues>(createInitialValues);
  const relationIdRef = React.useRef<string | null>(educationId || null);
  const [activeRelationId, setActiveRelationId] = React.useState<string | null>(educationId || null);
  const { saving, replaceSavedDraft, commitDraft } = useDetailAutoSaveController({
    draft,
    enabled: true,
    config: AUTO_EDITING,
    normalizeDraft,
    onSave: async (values) => {
      const requiredLevel = values.level.trim();
      if (!requiredLevel) {
        return values;
      }
      const payload = {
        level: requiredLevel,
        status: values.status.trim() || null,
        institution: values.institution.trim() || null,
        grade: values.grade.trim() || null,
        schoolYear: values.schoolYear.trim() || null,
        isCurrent: values.isCurrent,
        startDate: values.startDate || null,
        endDate: values.isCurrent ? null : values.endDate || null,
        notes: values.notes.trim() || null,
      };
      if (!relationIdRef.current) {
        const created = await create(payload);
        if (!created) return values;
        relationIdRef.current = created.id;
        setActiveRelationId(created.id);
        router.replace(withTenantPath(buildPeopleEducationPath(personId, created.id), tenantSlug));
        return initialFormValues(created);
      }
      const updated = await update(relationIdRef.current, payload);
      return initialFormValues(updated ?? current ?? undefined);
    },
  });

  React.useEffect(() => {
    if (mode !== "edit" || !current) return;
    const nextDraft = initialFormValues(current);
    relationIdRef.current = current.id;
    setActiveRelationId(current.id);
    setDraft(nextDraft);
    replaceSavedDraft(nextDraft);
  }, [current, mode, replaceSavedDraft]);

  const handleValuesChange = React.useCallback(
    (values: EducationFormValues) => {
      setDraft(values);
    },
    [],
  );

  const handleFieldCommit = React.useCallback(
    (values: EducationFormValues) => {
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

  return (
    <PeopleRelationDetailShell
      personId={personId}
      recordType="education"
      tab="escolaridade"
      title={mode === "create" ? "Novo registro escolar" : current?.level ?? "Escolaridade"}
      mode={mode}
      saving={saving}
      relationId={activeRelationId}
      auditConfig={EDUCATION_AUDIT_CONFIG}
      notes={draft.notes}
      onNotesChange={handleNotesChange}
      onNotesCommit={handleNotesCommit}
    >
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      {mode === "edit" && isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Carregando escolaridade...</div>
      ) : null}
      {mode === "edit" && !isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Registro nao encontrado.</div>
      ) : null}
      {mode === "create" || current ? (
        <EducationForm
          initialValues={mode === "create" ? createInitialValues : initialFormValues(current ?? undefined)}
          hideActions
          submitLabel="Salvar"
          onCancel={() => router.push(backHref)}
          onValuesChange={handleValuesChange}
          onFieldCommit={handleFieldCommit}
          onSubmit={() => undefined}
        />
      ) : null}
    </PeopleRelationDetailShell>
  );
}
