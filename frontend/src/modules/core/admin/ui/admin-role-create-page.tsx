"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRegisterUsageDocumentation } from "@/components/UsageDocumentation/UsageDocumentationProvider";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { listPermissions } from "@/features/admin/api";
import { RBAC_MODULE_LABELS, splitPermissionKey } from "@/features/admin/config/rbac.constants";
import { repairTextDecoding } from "@/lib/utils";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailRelationItemDialog } from "@/web-client/detail/DetailRelationItemDialog";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { canUseModuleAction } from "@/web-client/registry/module-utils";
import { adminRoleDetailModuleDefinition } from "@/modules/core/admin/config/admin-module-contract";
import {
  AdminPermissionMatrix,
  type AdminRoleDetailLayoutContext,
} from "@/modules/core/admin/config/admin-detail-layouts";
import type { AdminPermissionRecord, AdminRoleFormDraft, AdminRoleRecord } from "@/modules/core/admin/admin.types";
import { ADMIN_ROUTES, ADMIN_USAGE_TEXT } from "@/modules/core/admin/admin.constants";

function buildDraftRoleRecord(draft: AdminRoleFormDraft): AdminRoleRecord {
  return {
    id: "draft-role",
    name: draft.name || "Novo perfil",
    description: draft.description || null,
    permissions: [],
    permissionKeys: draft.permissionKeys,
    modules: [],
    moduleKeys: [],
    permissionCount: draft.permissionKeys.length,
    moduleCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapPermissionRecord(
  permission: Awaited<ReturnType<typeof listPermissions>>[number],
): AdminPermissionRecord {
  const parsed = splitPermissionKey(permission.key);
  const moduleKey = parsed?.moduleKey ?? "outros";
  return {
    ...permission,
    moduleKey,
    moduleLabel: repairTextDecoding(RBAC_MODULE_LABELS[moduleKey] ?? moduleKey) ?? moduleKey,
    action: parsed?.action ?? "read",
    description: repairTextDecoding(permission.description),
  };
}

export function AdminRoleCreatePage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const canCreate = canUseModuleAction(adminRoleDetailModuleDefinition, "create", permissions);

  const [draft, setDraft] = React.useState<AdminRoleFormDraft>({
    name: "",
    description: "",
    permissionKeys: [],
  });
  const [permissionOptions, setPermissionOptions] = React.useState<AdminRoleDetailLayoutContext["permissionOptions"]>([]);
  const [permissionRecords, setPermissionRecords] = React.useState<AdminPermissionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [permissionPickerOpen, setPermissionPickerOpen] = React.useState(false);
  const [permissionPickerSelection, setPermissionPickerSelection] = React.useState<string[]>([]);

  const usageItems = React.useMemo(
    () =>
      ADMIN_USAGE_TEXT.roles.sections.map((section, index) => ({
        id: `admin-roles-create-${index}`,
        title: section.title,
        searchText: section.items.join(" "),
        content: (
          <ul className="list-disc space-y-1 pl-5">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ),
      })),
    [],
  );

  useRegisterUsageDocumentation({
    title: ADMIN_USAGE_TEXT.roles.title,
    items: usageItems,
  });

  React.useEffect(() => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }
    if (!token || !canCreate) {
      setPermissionOptions([]);
      setPermissionRecords([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void listPermissions(token)
      .then((permissionsList) => {
        if (!cancelled) {
          setPermissionOptions(permissionsList);
          setPermissionRecords(permissionsList.map(mapPermissionRecord));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPermissionOptions([]);
          setPermissionRecords([]);
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
  }, [authLoading, canCreate, token, userLoading]);

  const selectedPermissionRecords = React.useMemo(
    () => permissionRecords.filter((permission) => draft.permissionKeys.includes(permission.key)),
    [draft.permissionKeys, permissionRecords],
  );

  const handleOpenPermissionPicker = React.useCallback(() => {
    setPermissionPickerSelection(draft.permissionKeys);
    setPermissionPickerOpen(true);
  }, [draft.permissionKeys]);

  const handleApplyPermissionSelection = React.useCallback(() => {
    const nextPermissionKeys = Array.from(new Set(permissionPickerSelection));
    setDraft((previous) => ({ ...previous, permissionKeys: nextPermissionKeys }));
    setPermissionPickerOpen(false);
  }, [permissionPickerSelection]);

  const handleRemovePermissionKey = React.useCallback((permissionKey: string) => {
    setDraft((previous) => ({
      ...previous,
      permissionKeys: previous.permissionKeys.filter((entry) => entry !== permissionKey),
    }));
  }, []);

  const handleCreate = React.useCallback(async () => {
    if (!canCreate) return;
    if (!draft.name.trim()) {
      setError("Informe o nome do perfil.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await dataProvider.create<AdminRoleRecord>(
        adminRoleDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.roles",
        {
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          permissionKeys: draft.permissionKeys,
        },
      );
      toast({ title: "Perfil criado" });
      router.push(withTenantPath(`${ADMIN_ROUTES.roles}/${created.id}`, tenantSlug));
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao criar perfil.";
      setError(message);
      toast({ variant: "destructive", title: "Falha ao criar", description: message });
    } finally {
      setSaving(false);
    }
  }, [canCreate, dataProvider, draft, router, tenantSlug, toast]);

  if (authLoading || userLoading || loading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando perfil...</div>;
  }

  if (!canCreate) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Você não tem permissão para criar perfis.</div>;
  }

  const context: AdminRoleDetailLayoutContext = {
    role: buildDraftRoleRecord(draft),
    draft,
    permissionOptions,
    selectedPermissionRecords,
    canEdit: true,
    canAudit: false,
    isCreate: true,
    auditVisibleCount: 0,
    onAuditVisibleCountChange: () => undefined,
    onDraftChange: setDraft,
    onOpenPermissionPicker: handleOpenPermissionPicker,
    onRemovePermissionKey: handleRemovePermissionKey,
  };

  return (
    <>
      {error ? <div className="px-4 pt-4 text-sm text-destructive">{error}</div> : null}

      <DetailShellEngine<AdminRoleDetailLayoutContext>
        moduleDefinition={adminRoleDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={false}
        mode="create"
        headerTitle={draft.name.trim() || "Novo perfil"}
        saving={saving}
        readOnly={false}
        onSave={() => void handleCreate()}
        onClose={() => router.push(withTenantPath(ADMIN_ROUTES.roles, tenantSlug))}
        breadcrumbTitle="Novo perfil"
        breadcrumbItems={[
          { label: "Geral", href: ADMIN_ROUTES.overview },
          { label: "Perfis", href: ADMIN_ROUTES.roles },
          { label: "Novo perfil" },
        ]}
      />

      <DetailRelationItemDialog
        open={permissionPickerOpen}
        onOpenChange={setPermissionPickerOpen}
        title="Vincular permissões"
        onSave={handleApplyPermissionSelection}
        saveLabel="Aplicar"
      >
        <AdminPermissionMatrix
          permissionOptions={permissionOptions}
          selectedPermissionKeys={permissionPickerSelection}
          readOnly={false}
          onChange={setPermissionPickerSelection}
        />
      </DetailRelationItemDialog>
    </>
  );
}
