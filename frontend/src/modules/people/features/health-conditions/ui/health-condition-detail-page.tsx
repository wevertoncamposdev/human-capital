"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { uploadHealthDocument } from "@/features/uploads/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { HealthConditionForm } from "@/modules/people/features/health-conditions/ui/health-condition-form";
import type { HealthConditionFormValues } from "@/modules/people/features/health-conditions/config/health-condition-form-config";
import { useHealthConditions } from "@/modules/people/features/health-conditions/data/use-health-conditions";
import type { HealthCondition } from "@/modules/people/shared/domain/types";
import {
  buildPeopleDetailTabPath,
  buildPeopleHealthConditionPath,
} from "@/modules/people/shared/domain/people-relation-routes";
import { PeopleRelationDetailShell } from "@/modules/people/shared/ui/people-relation-detail-shell";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import type { AuditFeedConfig, DetailEditingConfig } from "@/web-client/registry/types";

function initialFormValues(item?: HealthCondition): HealthConditionFormValues {
  return {
    type: item?.type ?? "",
    description: item?.description ?? "",
    severity: item?.severity ?? "",
    diagnosisDate: item?.diagnosisDate?.slice(0, 10) ?? "",
    documentFile: null,
    removeDocument: false,
    notes: item?.notes ?? "",
  };
}

const AUTO_EDITING: DetailEditingConfig = {
  saveMode: "auto",
  autoSave: { trigger: "field-commit" },
};

const HEALTH_CONDITION_AUDIT_CONFIG: AuditFeedConfig<{ relationId: string }> = {
  primaryEntity: {
    key: "health-condition",
    entity: "PersonHealthCondition",
    model: "audit.logs",
    label: "Condição de saúde",
    fieldLabels: {
      type: "Tipo de condição",
      description: "Descrição",
      severity: "Severidade",
      diagnosisDate: "Data do diagnóstico",
      documentUrl: "Documento",
      notes: "Notas",
    },
    valueFormatters: {
      documentUrl: (value) =>
        typeof value === "string" && value.trim() ? "Documento anexado" : "Sem documento",
    },
    resolveEntityId: ({ relationId }) => relationId,
  },
  filters: { entity: "PersonHealthCondition" },
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { limit: 120 },
};

function normalizeDraft(values: HealthConditionFormValues): HealthConditionFormValues {
  const normalizeFile = (file: File | null) =>
    file
      ? ({
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        } as unknown as File)
      : null;

  return {
    ...values,
    type: values.type.trim(),
    description: (values.description ?? "").trim(),
    severity: (values.severity ?? "").trim(),
    diagnosisDate: values.diagnosisDate || "",
    notes: (values.notes ?? "").trim(),
    documentFile: normalizeFile(values.documentFile instanceof File ? values.documentFile : null),
    removeDocument: Boolean(values.removeDocument),
  };
}

export function HealthConditionDetailPage({
  mode,
}: {
  mode: "create" | "edit";
}) {
  const params = useParams<{ id?: string; conditionId?: string }>();
  const personId = String(params?.id ?? "");
  const conditionId = mode === "edit" ? String(params?.conditionId ?? "") : "";
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { conditions, isLoading, error, create, update } = useHealthConditions(personId, {
    enabled: Boolean(personId),
  });
  const createInitialValues = React.useMemo(() => initialFormValues(), []);

  const current = React.useMemo(
    () => conditions.find((item) => item.id === conditionId) ?? null,
    [conditionId, conditions],
  );
  const backHref = withTenantPath(buildPeopleDetailTabPath(personId, "saude"), tenantSlug);
  const [draft, setDraft] = React.useState<HealthConditionFormValues>(createInitialValues);
  const relationIdRef = React.useRef<string | null>(conditionId || null);
  const [activeRelationId, setActiveRelationId] = React.useState<string | null>(conditionId || null);

  const { saving, replaceSavedDraft, commitDraft } = useDetailAutoSaveController({
    draft,
    enabled: Boolean(token),
    config: AUTO_EDITING,
    normalizeDraft,
    onSave: async (values) => {
      if (!token) return values;
      const requiredType = values.type.trim();
      if (!requiredType) {
        return values;
      }

      let documentUrl = current?.documentUrl ?? null;
      if (values.documentFile instanceof File) {
        documentUrl = (await uploadHealthDocument(token, values.documentFile)).path;
      } else if (values.removeDocument) {
        documentUrl = null;
      }

        const payload = {
          type: requiredType,
          description: (values.description ?? "").trim() || null,
          severity: (values.severity ?? "").trim() || null,
          diagnosisDate: values.diagnosisDate || null,
          notes: (values.notes ?? "").trim() || null,
          documentUrl,
        };

      if (!relationIdRef.current) {
        const created = await create(payload);
        if (!created) return values;
        relationIdRef.current = created.id;
        setActiveRelationId(created.id);
        const nextPath = withTenantPath(buildPeopleHealthConditionPath(personId, created.id), tenantSlug);
        router.replace(nextPath);
        return initialFormValues(created);
      }

      const updated = await update(relationIdRef.current, payload);
      return initialFormValues(updated ?? current ?? undefined);
    },
    onError: () => undefined,
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
    (values: HealthConditionFormValues) => {
      setDraft(values);
    },
    [],
  );

  const handleFieldCommit = React.useCallback(
    (values: HealthConditionFormValues) => {
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
      recordType="health-condition"
      tab="saude"
      title={mode === "create" ? "Nova condição de saúde" : current?.type ?? "Condição de saúde"}
      mode={mode}
      saving={saving}
      relationId={activeRelationId}
      auditConfig={HEALTH_CONDITION_AUDIT_CONFIG}
      notes={draft.notes}
      onNotesChange={handleNotesChange}
      onNotesCommit={handleNotesCommit}
    >
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      {mode === "edit" && isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Carregando condição...</div>
      ) : null}
      {mode === "edit" && !isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Condição não encontrada.</div>
      ) : null}
      {mode === "create" || current ? (
        <HealthConditionForm
          initialValues={mode === "create" ? createInitialValues : initialFormValues(current ?? undefined)}
          hideActions
          submitLabel="Salvar"
          onCancel={() => router.push(backHref)}
          showRemoveDocument={Boolean(current?.documentUrl)}
          onValuesChange={handleValuesChange}
          onFieldCommit={handleFieldCommit}
          onSubmit={() => undefined}
        />
      ) : null}
    </PeopleRelationDetailShell>
  );
}
