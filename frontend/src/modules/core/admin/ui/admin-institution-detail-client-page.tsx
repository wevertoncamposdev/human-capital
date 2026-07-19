"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { uploadTenantLogo } from "@/features/uploads/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import {
  canUseModuleAction,
  getModuleDetailEditingConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";
import { adminInstitutionModuleDefinition } from "@/modules/core/admin/config/admin-module-contract";
import type { AdminTenantLayoutContext } from "@/modules/core/admin/config/admin-detail-layouts";
import type { AdminTenantFormDraft, AdminTenantRecord } from "@/modules/core/admin/admin.types";
import { ADMIN_ROUTES } from "@/modules/core/admin/admin.constants";

function buildTenantDraft(record: AdminTenantRecord): AdminTenantFormDraft {
  return {
    name: record.name ?? "",
    slug: record.slug ?? "",
    cnpj: record.cnpj ?? "",
    startYear: record.startYear ? String(record.startYear) : "",
    description: record.description ?? "",
    logoUrl: record.logoUrl ?? null,
    logoFile: null,
  };
}

function normalizeTenantDraft(draft: AdminTenantFormDraft): AdminTenantFormDraft {
  return {
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    cnpj: draft.cnpj.trim(),
    startYear: draft.startYear.trim(),
    description: draft.description.trim(),
    logoUrl: draft.logoUrl?.trim() || null,
    logoFile: draft.logoFile ?? null,
  };
}

export function AdminInstitutionDetailClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const canRead = hasModulePermission(adminInstitutionModuleDefinition, "canRead", permissions);
  const canEdit = canUseModuleAction(adminInstitutionModuleDefinition, "edit", permissions);
  const canAudit = canUseModuleAction(adminInstitutionModuleDefinition, "audit", permissions);

  const [record, setRecord] = React.useState<AdminTenantRecord | null>(null);
  const [draft, setDraft] = React.useState<AdminTenantFormDraft | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);

  const persistDraft = React.useCallback(
    async (nextDraft: AdminTenantFormDraft) => {
      if (!canEdit || !token) {
        return nextDraft;
      }

      const normalized = normalizeTenantDraft(nextDraft);
      let logoUrl = normalized.logoUrl ?? undefined;
      if (normalized.logoFile) {
        const uploaded = await uploadTenantLogo(token, normalized.logoFile);
        logoUrl = uploaded.path;
      }

      const updated = await dataProvider.update<AdminTenantRecord>(
        adminInstitutionModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.tenant",
        "singleton",
        {
          name: normalized.name,
          slug: normalized.slug || undefined,
          cnpj: normalized.cnpj || undefined,
          startYear: normalized.startYear ? Number(normalized.startYear) : undefined,
          description: normalized.description || undefined,
          logoUrl,
        },
      );
      const savedDraft = buildTenantDraft(updated);
      setRecord(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [canEdit, dataProvider, token],
  );

  const autoSave = useDetailAutoSaveController<AdminTenantFormDraft>({
    draft,
    enabled: Boolean(record) && canEdit && Boolean(token),
    config: getModuleDetailEditingConfig(adminInstitutionModuleDefinition),
    normalizeDraft: normalizeTenantDraft,
    onSave: persistDraft,
    onError: (nextError) => {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao salvar instituicao.";
      setError(message);
      toast({ variant: "destructive", title: "Falha ao salvar", description: message });
    },
  });
  const { saving, replaceSavedDraft, commitField } = autoSave;

  React.useEffect(() => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }
    if (!token || !canRead) {
      setRecord(null);
      setDraft(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void dataProvider
      .read<AdminTenantRecord>(
        adminInstitutionModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.tenant",
        "singleton",
      )
      .then((response) => {
        if (cancelled) return;
        const nextDraft = buildTenantDraft(response);
        setRecord(response);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      })
      .catch((nextError) => {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao carregar instituicao.";
        if (!cancelled) {
          setRecord(null);
          setDraft(null);
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, canRead, dataProvider, replaceSavedDraft, token, userLoading]);

  const handleDraftChange = React.useCallback<
    React.Dispatch<React.SetStateAction<AdminTenantFormDraft>>
  >((next) => {
    setDraft((previous) =>
      previous
        ? typeof next === "function"
          ? (next as (prevState: AdminTenantFormDraft) => AdminTenantFormDraft)(previous)
          : next
        : previous,
    );
  }, []);

  const handleLogoUpdate = React.useCallback(
    async (file: File | null) => {
      if (!record || !canEdit || !token) {
        return;
      }

      setLogoUploading(true);
      setError(null);

      try {
        const logoUrl = file ? (await uploadTenantLogo(token, file)).path : "";
        const updated = await dataProvider.update<AdminTenantRecord>(
          adminInstitutionModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.tenant",
          "singleton",
          { logoUrl },
        );
        const nextDraft = buildTenantDraft(updated);
        setRecord(updated);
        setDraft(nextDraft);
        replaceSavedDraft(nextDraft);
      } catch (nextError) {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao atualizar logo.";
        setError(message);
        toast({ variant: "destructive", title: "Falha ao atualizar logo", description: message });
      } finally {
        setLogoUploading(false);
      }
    },
    [canEdit, dataProvider, record, replaceSavedDraft, toast, token],
  );

  if (!canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem permissao para acessar esta area.</div>;
  }

  if (loading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando instituicao...</div>;
  }

  if (error && (!record || !draft)) {
    return <div className="px-4 py-6 text-sm text-destructive">{error}</div>;
  }

  if (!record || !draft) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Instituicao nao encontrada.</div>;
  }

  const context: AdminTenantLayoutContext = {
    record,
    draft,
    canEdit,
    canAudit,
    logoUploading,
    auditVisibleCount,
    onAuditVisibleCountChange: setAuditVisibleCount,
    onDraftChange: handleDraftChange,
    onCommitField: commitField,
    onLogoFileChange: (file) => handleLogoUpdate(file),
  };

  return (
    <>
      {error ? <div className="px-4 pt-4 text-sm text-destructive">{error}</div> : null}

      <DetailShellEngine<AdminTenantLayoutContext>
        moduleDefinition={adminInstitutionModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={canAudit}
        mode="edit"
        headerTitle={record.name}
        saving={saving || logoUploading}
        readOnly={!canEdit}
        onClose={() => router.push(withTenantPath(ADMIN_ROUTES.overview, tenantSlug))}
        breadcrumbTitle="Instituicao"
        breadcrumbItems={[
          { label: "Geral", href: ADMIN_ROUTES.overview },
          { label: "Instituicao" },
        ]}
      />
    </>
  );
}
