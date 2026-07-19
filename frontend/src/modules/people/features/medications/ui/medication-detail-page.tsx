"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { uploadHealthDocument } from "@/features/uploads/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useMedications } from "@/modules/people/features/medications/data/use-medications";
import { MedicationForm } from "@/modules/people/features/medications/ui/medication-form";
import type { MedicationFormValues } from "@/modules/people/features/medications/config/medication-form-config";
import type { Medication } from "@/modules/people/shared/domain/types";
import {
  buildPeopleDetailTabPath,
  buildPeopleMedicationPath,
} from "@/modules/people/shared/domain/people-relation-routes";
import { PeopleRelationDetailShell } from "@/modules/people/shared/ui/people-relation-detail-shell";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import type { AuditFeedConfig, DetailEditingConfig } from "@/web-client/registry/types";

function initialValues(item?: Medication): MedicationFormValues {
  return {
    reason: item?.reason ?? "",
    medication: item?.medication ?? "",
    dosage: item?.dosage ?? "",
    schedule: item?.schedule ?? "",
    startDate: item?.startDate?.slice(0, 10) ?? "",
    endDate: item?.endDate?.slice(0, 10) ?? "",
    prescribingDoctor: item?.prescribingDoctor ?? "",
    permissionDocumentFile: null,
    removePermissionDocument: false,
    documentFile: null,
    removeDocument: false,
    notes: item?.notes ?? "",
  };
}

const AUTO_EDITING: DetailEditingConfig = {
  saveMode: "auto",
  autoSave: { trigger: "field-commit" },
};

const MEDICATION_AUDIT_CONFIG: AuditFeedConfig<{ relationId: string }> = {
  primaryEntity: {
    key: "medication",
    entity: "PersonMedication",
    model: "audit.logs",
    label: "Medicação",
    fieldLabels: {
      reason: "Motivo",
      medication: "Medicação",
      dosage: "Dosagem",
      schedule: "Horário",
      startDate: "Início",
      endDate: "Fim",
      prescribingDoctor: "Médico prescritor",
      permissionDocumentUrl: "Autorização",
      documentUrl: "Documento",
      notes: "Notas",
    },
    valueFormatters: {
      documentUrl: (value) =>
        typeof value === "string" && value.trim() ? "Documento anexado" : "Sem documento",
      permissionDocumentUrl: (value) =>
        typeof value === "string" && value.trim()
          ? "Autorização anexada"
          : "Sem autorização",
    },
    resolveEntityId: ({ relationId }) => relationId,
  },
  filters: { entity: "PersonMedication" },
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { limit: 120 },
};

function normalizeDraft(values: MedicationFormValues): MedicationFormValues {
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
    reason: (values.reason ?? "").trim(),
    medication: values.medication.trim(),
    dosage: (values.dosage ?? "").trim(),
    schedule: (values.schedule ?? "").trim(),
    startDate: values.startDate || "",
    endDate: values.endDate || "",
    prescribingDoctor: (values.prescribingDoctor ?? "").trim(),
    documentFile: normalizeFile(values.documentFile instanceof File ? values.documentFile : null),
    permissionDocumentFile: normalizeFile(
      values.permissionDocumentFile instanceof File ? values.permissionDocumentFile : null,
    ),
    removeDocument: Boolean(values.removeDocument),
    removePermissionDocument: Boolean(values.removePermissionDocument),
    notes: (values.notes ?? "").trim(),
  };
}

export function MedicationDetailPage({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string; medicationId?: string }>();
  const personId = String(params?.id ?? "");
  const medicationId = mode === "edit" ? String(params?.medicationId ?? "") : "";
  const { token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { medications, isLoading, error, create, update } = useMedications(personId, {
    enabled: Boolean(personId),
  });
  const createInitialValues = React.useMemo(() => initialValues(), []);

  const current = React.useMemo(
    () => medications.find((item) => item.id === medicationId) ?? null,
    [medicationId, medications],
  );
  const backHref = withTenantPath(buildPeopleDetailTabPath(personId, "medicacoes"), tenantSlug);
  const [draft, setDraft] = React.useState<MedicationFormValues>(createInitialValues);
  const relationIdRef = React.useRef<string | null>(medicationId || null);
  const [activeRelationId, setActiveRelationId] = React.useState<string | null>(medicationId || null);

  const { saving, replaceSavedDraft, commitDraft } = useDetailAutoSaveController({
    draft,
    enabled: Boolean(token),
    config: AUTO_EDITING,
    normalizeDraft,
    onSave: async (values) => {
      if (!token) return values;
      const requiredMedication = values.medication.trim();
      if (!requiredMedication) {
        return values;
      }

      let documentUrl = current?.documentUrl ?? null;
      let permissionDocumentUrl = current?.permissionDocumentUrl ?? null;
      if (values.documentFile instanceof File) {
        documentUrl = (await uploadHealthDocument(token, values.documentFile)).path;
      } else if (values.removeDocument) {
        documentUrl = null;
      }
      if (values.permissionDocumentFile instanceof File) {
        permissionDocumentUrl = (
          await uploadHealthDocument(token, values.permissionDocumentFile)
        ).path;
      } else if (values.removePermissionDocument) {
        permissionDocumentUrl = null;
      }
      const payload = {
        reason: (values.reason ?? "").trim() || null,
        medication: requiredMedication,
        dosage: (values.dosage ?? "").trim() || null,
        schedule: (values.schedule ?? "").trim() || null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        prescribingDoctor: (values.prescribingDoctor ?? "").trim() || null,
        notes: (values.notes ?? "").trim() || null,
        documentUrl,
        permissionDocumentUrl,
      };
      if (!relationIdRef.current) {
        const created = await create(payload);
        if (!created) return values;
        relationIdRef.current = created.id;
        setActiveRelationId(created.id);
        router.replace(withTenantPath(buildPeopleMedicationPath(personId, created.id), tenantSlug));
        return initialValues(created);
      }
      const updated = await update(relationIdRef.current, payload);
      return initialValues(updated ?? current ?? undefined);
    },
  });

  React.useEffect(() => {
    if (mode !== "edit" || !current) return;
    const nextDraft = initialValues(current);
    relationIdRef.current = current.id;
    setActiveRelationId(current.id);
    setDraft(nextDraft);
    replaceSavedDraft(nextDraft);
  }, [current, mode, replaceSavedDraft]);

  const handleValuesChange = React.useCallback(
    (values: MedicationFormValues) => {
      setDraft(values);
    },
    [],
  );

  const handleFieldCommit = React.useCallback(
    (values: MedicationFormValues) => {
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
      recordType="medication"
      tab="medicacoes"
      title={mode === "create" ? "Nova medicação" : current?.medication ?? "Medicação"}
      mode={mode}
      saving={saving}
      relationId={activeRelationId}
      auditConfig={MEDICATION_AUDIT_CONFIG}
      notes={draft.notes}
      onNotesChange={handleNotesChange}
      onNotesCommit={handleNotesCommit}
    >
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      {mode === "edit" && isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Carregando medicação...</div>
      ) : null}
      {mode === "edit" && !isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Medicação não encontrada.</div>
      ) : null}
      {mode === "create" || current ? (
        <MedicationForm
          initialValues={mode === "create" ? createInitialValues : initialValues(current ?? undefined)}
          hideActions
          submitLabel="Salvar"
          onCancel={() => router.push(backHref)}
          showRemoveDocument={Boolean(current?.documentUrl)}
          showRemovePermissionDocument={Boolean(current?.permissionDocumentUrl)}
          onValuesChange={handleValuesChange}
          onFieldCommit={handleFieldCommit}
          onSubmit={() => undefined}
        />
      ) : null}
    </PeopleRelationDetailShell>
  );
}
