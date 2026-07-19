"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRegisterUsageDocumentation } from "@/components/UsageDocumentation/UsageDocumentationProvider";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { listPermissions } from "@/features/admin/api";
import { RBAC_MODULE_LABELS, splitPermissionKey } from "@/features/admin/config/rbac.constants";
import { repairTextDecoding } from "@/lib/utils";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailRelationItemDialog } from "@/web-client/detail/DetailRelationItemDialog";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import {
  canUseModuleAction,
  getModuleDetailEditingConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";
import { adminRoleDetailModuleDefinition } from "@/modules/core/admin/config/admin-module-contract";
import {
  AdminPermissionMatrix,
  type AdminRoleDetailLayoutContext,
} from "@/modules/core/admin/config/admin-detail-layouts";
import type { AdminPermissionRecord, AdminRoleFormDraft, AdminRoleRecord } from "@/modules/core/admin/admin.types";
import { ADMIN_ROUTES, ADMIN_USAGE_TEXT } from "@/modules/core/admin/admin.constants";

function buildRoleDraft(record: AdminRoleRecord): AdminRoleFormDraft {
  return {
    name: record.name,
    description: record.description ?? "",
    permissionKeys: record.permissionKeys ?? [],
  };
}

function normalizeRoleDraft(draft: AdminRoleFormDraft): AdminRoleFormDraft {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    permissionKeys: Array.from(
      new Set(draft.permissionKeys.map((entry) => entry.trim()).filter(Boolean)),
    ),
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

export function AdminRoleDetailEngineClientPage() {
  const params = useParams<{ id?: string }>();
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const id = params?.id ? String(params.id) : "";

  const canRead = hasModulePermission(adminRoleDetailModuleDefinition, "canRead", permissions);
  const canEdit = canUseModuleAction(adminRoleDetailModuleDefinition, "edit", permissions);
  const canDelete = canUseModuleAction(adminRoleDetailModuleDefinition, "delete", permissions);
  const canAudit = canUseModuleAction(adminRoleDetailModuleDefinition, "audit", permissions);

  const [role, setRole] = React.useState<AdminRoleRecord | null>(null);
  const [draft, setDraft] = React.useState<AdminRoleFormDraft | null>(null);
  const [permissionOptions, setPermissionOptions] = React.useState<AdminRoleDetailLayoutContext["permissionOptions"]>([]);
  const [permissionRecords, setPermissionRecords] = React.useState<AdminPermissionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);
  const [permissionPickerOpen, setPermissionPickerOpen] = React.useState(false);
  const [permissionPickerSelection, setPermissionPickerSelection] = React.useState<string[]>([]);

  const usageItems = React.useMemo(
    () =>
      ADMIN_USAGE_TEXT.roles.sections.map((section, index) => ({
        id: `admin-roles-detail-${index}`,
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

  const selectedPermissionRecords = React.useMemo(
    () =>
      permissionRecords.filter((permission) => draft?.permissionKeys.includes(permission.key)),
    [draft?.permissionKeys, permissionRecords],
  );

  const persistDraft = React.useCallback(
    async (nextDraft: AdminRoleFormDraft) => {
      if (!role || !canEdit) {
        return nextDraft;
      }

      const normalized = normalizeRoleDraft(nextDraft);
      const updated = await dataProvider.update<AdminRoleRecord>(
        adminRoleDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.roles",
        role.id,
        {
          name: normalized.name,
          description: normalized.description || undefined,
          permissionKeys: normalized.permissionKeys,
        },
      );
      const savedDraft = buildRoleDraft(updated);
      setRole(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [canEdit, dataProvider, role],
  );

  const autoSave = useDetailAutoSaveController<AdminRoleFormDraft>({
    draft,
    enabled: Boolean(role) && canEdit && Boolean(token),
    config: getModuleDetailEditingConfig(adminRoleDetailModuleDefinition),
    normalizeDraft: normalizeRoleDraft,
    onSave: persistDraft,
    onError: (nextError) => {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao salvar perfil.";
      setError(message);
      toast({ variant: "destructive", title: "Falha ao salvar", description: message });
    },
  });
  const { saving, replaceSavedDraft, commitField, commitDraft } = autoSave;

  React.useEffect(() => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }
    if (!token || !canRead || !id) {
      setRole(null);
      setDraft(null);
      setPermissionOptions([]);
      setPermissionRecords([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      dataProvider.read<AdminRoleRecord>(
        adminRoleDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.roles",
        id,
      ),
      listPermissions(token),
    ])
      .then(([roleRecord, permissionsList]) => {
        if (cancelled) return;
        const nextDraft = buildRoleDraft(roleRecord);
        setRole(roleRecord);
        setDraft(nextDraft);
        setPermissionOptions(permissionsList);
        setPermissionRecords(permissionsList.map(mapPermissionRecord));
        replaceSavedDraft(nextDraft);
      })
      .catch((nextError) => {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
          : "Falha ao carregar perfil.";
        if (!cancelled) {
          setRole(null);
          setDraft(null);
          setPermissionOptions([]);
          setPermissionRecords([]);
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
  }, [authLoading, canRead, dataProvider, id, replaceSavedDraft, token, userLoading]);

  const handleDelete = React.useCallback(async () => {
    if (!role || !canDelete) return;
    if (!window.confirm(`Excluir o perfil ${role.name}?`)) return;

    setDeleting(true);
    setError(null);

    try {
      await dataProvider.delete(
        adminRoleDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.roles",
        role.id,
      );
      toast({ title: "Perfil excluido" });
      router.push(withTenantPath(ADMIN_ROUTES.roles, tenantSlug));
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao excluir perfil.";
      setError(message);
      toast({ variant: "destructive", title: "Falha ao excluir", description: message });
    } finally {
      setDeleting(false);
    }
  }, [canDelete, dataProvider, role, router, tenantSlug, toast]);

  const handleDraftChange = React.useCallback<
    React.Dispatch<React.SetStateAction<AdminRoleFormDraft>>
  >((next) => {
    setDraft((previous) =>
      previous
        ? typeof next === "function"
          ? (next as (prevState: AdminRoleFormDraft) => AdminRoleFormDraft)(previous)
          : next
        : previous,
    );
  }, []);

  const handleOpenPermissionPicker = React.useCallback(() => {
    setPermissionPickerSelection(draft?.permissionKeys ?? []);
    setPermissionPickerOpen(true);
  }, [draft?.permissionKeys]);

  const handleApplyPermissionSelection = React.useCallback(() => {
    if (!draft) return;
    const nextDraft = {
      ...draft,
      permissionKeys: Array.from(new Set(permissionPickerSelection)),
    };
    setDraft(nextDraft);
    commitDraft(nextDraft);
    setPermissionPickerOpen(false);
  }, [commitDraft, draft, permissionPickerSelection]);

  const handleRemovePermissionKey = React.useCallback(
    (permissionKey: string) => {
      if (!draft) return;
      const nextDraft = {
        ...draft,
        permissionKeys: draft.permissionKeys.filter((entry) => entry !== permissionKey),
      };
      setDraft(nextDraft);
      commitDraft(nextDraft);
    },
    [commitDraft, draft],
  );

  if (!canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Você não tem permissão para acessar esta área.</div>;
  }

  if (loading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando perfil...</div>;
  }

  if (error && (!role || !draft)) {
    return <div className="px-4 py-6 text-sm text-destructive">{error}</div>;
  }

  if (!role || !draft) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Perfil não encontrado.</div>;
  }

  const context: AdminRoleDetailLayoutContext = {
    role,
    draft,
    permissionOptions,
    selectedPermissionRecords,
    canEdit,
    canAudit,
    auditVisibleCount,
    onAuditVisibleCountChange: setAuditVisibleCount,
    onDraftChange: handleDraftChange,
    onOpenPermissionPicker: handleOpenPermissionPicker,
    onRemovePermissionKey: handleRemovePermissionKey,
    onCommitField: commitField,
    onCommitDraft: commitDraft,
  };

  return (
    <>
      {error ? <div className="px-4 pt-4 text-sm text-destructive">{error}</div> : null}

      <DetailShellEngine<AdminRoleDetailLayoutContext>
        moduleDefinition={adminRoleDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={canAudit}
        mode="edit"
        headerTitle={role.name}
        saving={saving}
        readOnly={!canEdit}
        onClose={() => router.push(withTenantPath(ADMIN_ROUTES.roles, tenantSlug))}
        breadcrumbTitle={role.name}
        breadcrumbItems={[
          { label: "Geral", href: ADMIN_ROUTES.overview },
          { label: "Perfis", href: ADMIN_ROUTES.roles },
          { label: role.name },
        ]}
        headerActionsSlot={
          <div className="flex items-center gap-2">
            {canDelete ? (
              <Button variant="ghost" size="sm" onClick={() => void handleDelete()} disabled={saving || deleting}>
                {deleting ? "Excluindo..." : "Excluir"}
              </Button>
            ) : null}
          </div>
        }
      />

      <DetailRelationItemDialog
        open={permissionPickerOpen}
        onOpenChange={setPermissionPickerOpen}
        title="Vincular permissões"
        onSave={handleApplyPermissionSelection}
        saveLabel="Aplicar"
        saving={saving}
      >
        <AdminPermissionMatrix
          permissionOptions={permissionOptions}
          selectedPermissionKeys={permissionPickerSelection}
          readOnly={saving}
          onChange={setPermissionPickerSelection}
        />
      </DetailRelationItemDialog>
    </>
  );
}
