"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { hasModulePermission } from "@/web-client/registry/module-utils";
import {
  adminInstitutionModuleDefinition,
  adminOverviewModuleDefinition,
  adminRoleDetailModuleDefinition,
  adminUserDetailModuleDefinition,
} from "@/modules/core/admin/config/admin-module-contract";
import type { AdminOverviewLayoutContext } from "@/modules/core/admin/config/admin-detail-layouts";
import { ADMIN_ROUTES } from "@/modules/core/admin/admin.constants";

export function AdminOverviewClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const canRead = hasModulePermission(adminOverviewModuleDefinition, "canRead", permissions);
  const canReadInstitution = hasModulePermission(adminInstitutionModuleDefinition, "canRead", permissions);
  const canReadUsers = hasModulePermission(adminUserDetailModuleDefinition, "canRead", permissions);
  const canReadRoles = hasModulePermission(adminRoleDetailModuleDefinition, "canRead", permissions);
  const canReadAudit = permissions.includes("audit.read");

  const [record, setRecord] = React.useState<AdminOverviewLayoutContext["record"] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }
    if (!token || !canRead) {
      setRecord(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void dataProvider
      .read<AdminOverviewLayoutContext["record"]>(
        adminOverviewModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.settings",
        "singleton",
      )
      .then((response) => {
        if (!cancelled) {
          setRecord(response);
        }
      })
      .catch((nextError) => {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao carregar configuracoes.";
        if (!cancelled) {
          setRecord(null);
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
  }, [authLoading, canRead, dataProvider, token, userLoading]);

  if (!canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem permissao para acessar esta area.</div>;
  }

  if (loading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando configuracoes...</div>;
  }

  if (error || !record) {
    return <div className="px-4 py-6 text-sm text-destructive">{error ?? "Configuracao nao encontrada."}</div>;
  }

  const context: AdminOverviewLayoutContext = {
    record,
    canReadInstitution,
    canReadUsers,
    canReadRoles,
    canReadAudit,
    onOpenInstitution: () => router.push(withTenantPath(ADMIN_ROUTES.institution, tenantSlug)),
    onOpenUsers: () => router.push(withTenantPath(ADMIN_ROUTES.users, tenantSlug)),
    onOpenRoles: () => router.push(withTenantPath(ADMIN_ROUTES.roles, tenantSlug)),
    onOpenAudit: () => router.push(withTenantPath(ADMIN_ROUTES.audit, tenantSlug)),
  };

  return (
    <DetailShellEngine<AdminOverviewLayoutContext>
      moduleDefinition={adminOverviewModuleDefinition}
      context={context}
      dataProvider={dataProvider}
      auditEnabled={false}
      mode="view"
      headerTitle={record.name}
      saving={false}
      loading={loading}
      readOnly
      onClose={() => router.push(withTenantPath("/dashboard", tenantSlug))}
      breadcrumbTitle="Geral"
      breadcrumbItems={[{ label: "Geral" }]}
    />
  );
}
