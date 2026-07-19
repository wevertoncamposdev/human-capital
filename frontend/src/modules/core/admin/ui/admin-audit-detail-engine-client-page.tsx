"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import {
  hasModulePermission,
} from "@/web-client/registry/module-utils";
import { ADMIN_ROUTES } from "@/modules/core/admin/admin.constants";
import {
  adminAuditDetailModuleDefinition,
} from "@/modules/core/admin/config/admin-module-contract";
import type { AdminAuditDetailLayoutContext } from "@/modules/core/admin/config/admin-detail-layouts";
import type { AdminAuditRecord } from "@/modules/core/admin/admin.types";

export function AdminAuditDetailEngineClientPage() {
  const params = useParams<{ id?: string }>();
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const id = params?.id ? String(params.id) : "";

  const canRead = hasModulePermission(adminAuditDetailModuleDefinition, "canRead", permissions);
  const [record, setRecord] = React.useState<AdminAuditRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }
    if (!token || !canRead || !id) {
      setRecord(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void dataProvider
      .read<AdminAuditRecord>(
        adminAuditDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.audit",
        id,
      )
      .then((nextRecord) => {
        if (!cancelled) setRecord(nextRecord);
      })
      .catch((nextError) => {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao carregar auditoria.";
        if (!cancelled) {
          setRecord(null);
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, canRead, dataProvider, id, token, userLoading]);

  if (!canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem permissao para acessar esta area.</div>;
  }

  if (loading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando auditoria...</div>;
  }

  if (error && !record) {
    return <div className="px-4 py-6 text-sm text-destructive">{error}</div>;
  }

  if (!record) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Registro de auditoria nao encontrado.</div>;
  }

  const context: AdminAuditDetailLayoutContext = { record };

  return (
    <DetailShellEngine<AdminAuditDetailLayoutContext>
      moduleDefinition={adminAuditDetailModuleDefinition}
      context={context}
      dataProvider={dataProvider}
      auditEnabled={false}
      mode="view"
      headerTitle={`${record.entity} • ${record.action}`}
      saving={false}
      readOnly
      onClose={() => router.push(withTenantPath(ADMIN_ROUTES.audit, tenantSlug))}
      breadcrumbTitle={`${record.entity} • ${record.action}`}
      breadcrumbItems={[
        { label: "Geral", href: ADMIN_ROUTES.overview },
        { label: "Auditoria", href: ADMIN_ROUTES.audit },
        { label: `${record.entity} • ${record.action}` },
      ]}
    />
  );
}
