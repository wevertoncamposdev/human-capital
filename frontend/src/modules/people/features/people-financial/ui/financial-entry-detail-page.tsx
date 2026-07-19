"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useFamilyRelations } from "@/modules/people/features/family-members/data/use-family-relations";
import { usePeopleFinancial } from "@/modules/people/features/people-financial/data/use-people-financial";
import {
  FinancialEntryForm,
  type FinancialEntryFormValues,
} from "@/modules/people/features/people-financial/ui/financial-entry-form";
import type { PersonFinancialEntry } from "@/modules/people/shared/domain/types";
import { buildPeopleFinancialEntryPath } from "@/modules/people/shared/domain/people-relation-routes";
import { PeopleRelationDetailShell } from "@/modules/people/shared/ui/people-relation-detail-shell";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import type { AuditFeedConfig, DetailEditingConfig } from "@/web-client/registry/types";

function initialFormValues(item?: PersonFinancialEntry): FinancialEntryFormValues {
  return {
    entryType: item?.entryType ?? "INCOME",
    category: item?.category ?? "",
    subcategory: item?.subcategory ?? "",
    status: item?.status ?? "",
    amount:
      typeof item?.amount === "number" && Number.isFinite(item.amount)
        ? String(item.amount)
        : "",
    frequency: item?.frequency ?? "MONTHLY",
    contractType: item?.contractType ?? "",
    householdId: item?.householdId ?? "",
    fromHouseholdId: item?.fromHouseholdId ?? "",
    toHouseholdId: item?.toHouseholdId ?? "",
    includeInHouseholdBudget: item?.includeInHouseholdBudget ?? true,
    startDate: item?.startDate?.slice(0, 10) ?? "",
    endDate: item?.endDate?.slice(0, 10) ?? "",
    notes: item?.notes ?? "",
  };
}

function normalizeAmountValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return value.trim();
}

function parseAmountInput(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const AUTO_EDITING: DetailEditingConfig = {
  saveMode: "auto",
  autoSave: { trigger: "field-commit" },
};

const AUDIT_CONFIG: AuditFeedConfig<{ relationId: string }> = {
  primaryEntity: {
    key: "financialEntry",
    entity: "PersonFinancialEntry",
    model: "audit.logs",
    label: "Financeiro",
    fieldLabels: {
      entryType: "Tipo",
      category: "Categoria",
      subcategory: "Subcategoria",
      status: "Status",
      amount: "Valor",
      frequency: "Frequência",
      contractType: "Contrato",
      householdId: "Família",
      fromHouseholdId: "Origem",
      toHouseholdId: "Destino",
      includeInHouseholdBudget: "No cálculo familiar",
      startDate: "Início",
      endDate: "Fim",
      notes: "Notas",
    },
    resolveEntityId: ({ relationId }) => relationId,
  },
  filters: { entity: "PersonFinancialEntry" },
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { limit: 120 },
};

export function FinancialEntryDetailPage({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{
    id?: string;
    entryId?: string;
    incomeId?: string;
    expenseId?: string;
    transferId?: string;
    benefitId?: string;
  }>();
  const personId = String(params?.id ?? "");
  const entryId =
    mode === "edit"
      ? String(
          params?.entryId ??
            params?.incomeId ??
            params?.expenseId ??
            params?.transferId ??
            params?.benefitId ??
            "",
        )
      : "";
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { data: familyData, loadDetailed } = useFamilyRelations(personId, {
    autoLoad: true,
    initialMode: "detailed",
  });
  const { entries, isLoading, error, create, update } = usePeopleFinancial(personId, {
    enabled: Boolean(personId),
  });
  const current = React.useMemo(
    () => entries.find((item) => item.id === entryId) ?? null,
    [entries, entryId],
  );
  const createInitialValues = React.useMemo(() => initialFormValues(), []);

  React.useEffect(() => {
    if (!familyData) void loadDetailed();
  }, [familyData, loadDetailed]);

  const householdOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const currentId = familyData?.household?.id ?? null;
    if (currentId) {
      options.push({
        value: currentId,
        label: familyData?.household?.name ?? "Residencia atual",
      });
    }
    (familyData?.relatedHouseholds ?? []).forEach((item) => {
      if (!item.householdId || item.householdId === currentId) return;
      options.push({
        value: item.householdId,
        label: item.householdName ?? `Residencia de ${item.personName}`,
      });
    });
    const seen = new Set<string>();
    return options.filter((item) => {
      if (seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });
  }, [familyData]);

  const [draft, setDraft] = React.useState<FinancialEntryFormValues>(createInitialValues);
  const relationIdRef = React.useRef<string | null>(entryId || null);
  const [activeRelationId, setActiveRelationId] = React.useState<string | null>(entryId || null);
  const { saving, replaceSavedDraft, commitDraft } = useDetailAutoSaveController({
    draft,
    enabled: true,
    config: AUTO_EDITING,
    normalizeDraft: (values) => ({
      ...values,
      category: values.category.trim(),
      subcategory: values.subcategory.trim(),
      status: values.status.trim(),
      amount: normalizeAmountValue(values.amount),
      frequency: values.frequency.trim(),
      contractType: values.contractType.trim(),
      notes: values.notes.trim(),
    }),
    onSave: async (values) => {
      if (!values.category.trim()) return values;
      const parsedAmount = parseAmountInput(normalizeAmountValue(values.amount));
      const payload = {
        entryType: values.entryType,
        category: values.category.trim(),
        subcategory: values.subcategory.trim() || null,
        status: values.status.trim() || null,
        amount: parsedAmount,
        frequency: values.frequency || "MONTHLY",
        contractType: values.contractType.trim() || null,
        householdId: values.entryType === "TRANSFER" ? null : values.householdId || null,
        fromHouseholdId: values.entryType === "TRANSFER" ? values.fromHouseholdId || null : null,
        toHouseholdId: values.entryType === "TRANSFER" ? values.toHouseholdId || null : null,
        includeInHouseholdBudget: values.includeInHouseholdBudget,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        notes: values.notes.trim() || null,
      };
      if (!relationIdRef.current) {
        const created = await create(payload);
        if (!created) return values;
        relationIdRef.current = created.id;
        setActiveRelationId(created.id);
        router.replace(withTenantPath(buildPeopleFinancialEntryPath(personId, created.id), tenantSlug));
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
      recordType="financial-entry"
      tab="financeiro"
      title={mode === "create" ? "Novo registro financeiro" : current?.category ?? "Financeiro"}
      mode={mode}
      saving={saving}
      relationId={activeRelationId}
      auditConfig={AUDIT_CONFIG}
      notes={draft.notes}
      onNotesChange={handleNotesChange}
      onNotesCommit={handleNotesCommit}
    >
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      {mode === "edit" && isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Carregando registro financeiro...</div>
      ) : null}
      {mode === "edit" && !isLoading && !current ? (
        <div className="text-sm text-muted-foreground">Registro financeiro não encontrado.</div>
      ) : null}
      {mode === "create" || current ? (
        <FinancialEntryForm
          initialValues={mode === "create" ? createInitialValues : initialFormValues(current ?? undefined)}
          householdOptions={householdOptions}
          onValuesChange={setDraft}
          onFieldCommit={(values) => {
            setDraft(values);
            commitDraft(values);
          }}
          onSubmit={() => undefined}
        />
      ) : null}
    </PeopleRelationDetailShell>
  );
}
