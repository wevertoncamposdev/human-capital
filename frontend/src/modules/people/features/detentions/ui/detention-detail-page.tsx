"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useDetentions } from "@/modules/people/features/detentions/data/use-detentions";
import {
  DetentionForm,
  type DetentionFormValues,
} from "@/modules/people/features/detentions/ui/detention-form";
import type { PersonDetention } from "@/modules/people/shared/domain/types";
import {
  buildPeopleDetailTabPath,
  buildPeopleDetentionPath,
} from "@/modules/people/shared/domain/people-relation-routes";
import { PeopleRelationDetailShell } from "@/modules/people/shared/ui/people-relation-detail-shell";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import type { AuditFeedConfig, DetailEditingConfig } from "@/web-client/registry/types";

function initialFormValues(item?: PersonDetention): DetentionFormValues {
  return {
    status: item?.status ?? "",
    type: item?.type ?? "",
    unit: item?.unit ?? "",
    startDate: item?.startDate?.slice(0, 10) ?? "",
    endDate: item?.endDate?.slice(0, 10) ?? "",
    notes: item?.notes ?? "",
  };
}

const AUTO_EDITING: DetailEditingConfig = {
  saveMode: "auto",
  autoSave: { trigger: "field-commit" },
};

const DETENTION_AUDIT_CONFIG: AuditFeedConfig<{ relationId: string }> = {
  primaryEntity: {
    key: "detention",
    entity: "PersonDetention",
    model: "audit.logs",
    label: "Reclusão",
    fieldLabels: {
      status: "Status",
      type: "Tipo",
      unit: "Unidade",
      startDate: "Início",
      endDate: "Fim",
      notes: "Notas",
    },
    resolveEntityId: ({ relationId }) => relationId,
  },
  filters: { entity: "PersonDetention" },
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { limit: 120 },
};

function normalizeDraft(values: DetentionFormValues): DetentionFormValues {
  return {
    ...values,
    status: values.status.trim(),
    type: values.type.trim(),
    unit: values.unit.trim(),
    startDate: values.startDate || "",
    endDate: values.endDate || "",
    notes: values.notes.trim(),
  };
}

export function DetentionDetailPage({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string; detentionId?: string }>();
  const personId = String(params?.id ?? "");
  const detentionId = mode === "edit" ? String(params?.detentionId ?? "") : "";
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { detentions, isLoading, error, create, update } = useDetentions(personId, {
    enabled: Boolean(personId),
  });
  const createInitialValues = React.useMemo(() => initialFormValues(), []);

  const current = React.useMemo(
    () => detentions.find((item) => item.id === detentionId) ?? null,
    [detentionId, detentions],
  );
  const backHref = withTenantPath(buildPeopleDetailTabPath(personId, "reclusao"), tenantSlug);

  const [draft, setDraft] = React.useState<DetentionFormValues>(createInitialValues);
  const relationIdRef = React.useRef<string | null>(detentionId || null);
  const [activeRelationId, setActiveRelationId] = React.useState<string | null>(detentionId || null);
  const { saving, replaceSavedDraft, commitDraft } = useDetailAutoSaveController({
    draft,
    enabled: true,
    config: AUTO_EDITING,
    normalizeDraft,
    onSave: async (values) => {
      const requiredStatus = values.status.trim();
      if (!requiredStatus) {
        return values;
      }
      const payload = {
        status: requiredStatus,
        type: values.type.trim() || null,
        unit: values.unit.trim() || null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        notes: values.notes.trim() || null,
      };
      if (!relationIdRef.current) {
        const created = await create(payload);
        if (!created) return values;
        relationIdRef.current = created.id;
        setActiveRelationId(created.id);
        router.replace(withTenantPath(buildPeopleDetentionPath(personId, created.id), tenantSlug));
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
    (values: DetentionFormValues) => {
      setDraft(values);
    },
    [],
  );

  const handleFieldCommit = React.useCallback(
    (values: DetentionFormValues) => {
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
      recordType="detention"
      tab="reclusao"
      title={mode === "create" ? "Novo registro de reclusão" : current?.status ?? "Reclusão"}
      mode={mode}
      saving={saving}
      relationId={activeRelationId}
      auditConfig={DETENTION_AUDIT_CONFIG}
      notes={draft.notes}
      onNotesChange={handleNotesChange}
      onNotesCommit={handleNotesCommit}
    >
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      {mode === "edit" && isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Carregando registro...</div>
      ) : null}
      {mode === "edit" && !isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Registro não encontrado.</div>
      ) : null}
      {mode === "create" || current ? (
        <DetentionForm
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
