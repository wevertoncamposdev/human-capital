"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRegisterUsageDocumentation } from "@/components/UsageDocumentation/UsageDocumentationProvider";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { listRoles } from "@/features/admin/api";
import { uploadAvatar } from "@/features/uploads/api";
import { stripApiUrl } from "@/lib/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailRelationItemDialog } from "@/web-client/detail/DetailRelationItemDialog";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { CompactMultiSelect } from "@/web-client/ui/CompactMultiSelect";
import { canUseModuleAction } from "@/web-client/registry/module-utils";
import { adminUserDetailModuleDefinition } from "@/modules/core/admin/config/admin-module-contract";
import type { AdminUserDetailLayoutContext } from "@/modules/core/admin/config/admin-detail-layouts";
import type { AdminUserFormDraft, AdminUserRecord, AdminUserRoleOption } from "@/modules/core/admin/admin.types";
import { ADMIN_ROUTES, ADMIN_USAGE_TEXT } from "@/modules/core/admin/admin.constants";

function buildDraftUserRecord(draft: AdminUserFormDraft): AdminUserRecord {
  return {
    id: "draft-user",
    name: draft.name || "Novo usuário",
    email: draft.email || "",
    avatarUrl:
      typeof draft.avatarUrl === "string" && draft.avatarUrl.trim() ? draft.avatarUrl : null,
    isActive: draft.isActive,
    roles: [],
    roleIds: draft.roleIds,
    roleNames: [],
    mfaTotpEnabled: false,
    phone: null,
    bio: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapRoleOption(role: Awaited<ReturnType<typeof listRoles>>[number]): AdminUserRoleOption {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? null,
  };
}

export function AdminUserCreatePage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const canCreate = canUseModuleAction(adminUserDetailModuleDefinition, "create", permissions);

  const [draft, setDraft] = React.useState<AdminUserFormDraft>({
    name: "",
    email: "",
    password: "",
    isActive: true,
    roleIds: [],
    avatarUrl: null,
  });
  const [roleOptions, setRoleOptions] = React.useState<AdminUserRoleOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rolePickerOpen, setRolePickerOpen] = React.useState(false);
  const [rolePickerSelection, setRolePickerSelection] = React.useState<string[]>([]);

  const usageItems = React.useMemo(
    () =>
      ADMIN_USAGE_TEXT.users.sections.map((section, index) => ({
        id: `admin-users-create-${index}`,
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
    title: ADMIN_USAGE_TEXT.users.title,
    items: usageItems,
  });

  React.useEffect(() => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }
    if (!token || !canCreate) {
      setRoleOptions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void listRoles(token)
      .then((roles) => {
        if (!cancelled) {
          setRoleOptions(roles.map(mapRoleOption));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoleOptions([]);
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

  const selectedRoleOptions = React.useMemo(
    () => roleOptions.filter((role) => draft.roleIds.includes(role.id)),
    [draft.roleIds, roleOptions],
  );

  const draftUserRecord = React.useMemo(
    () => ({
      ...buildDraftUserRecord(draft),
      roles: selectedRoleOptions,
      roleIds: draft.roleIds,
      roleNames: selectedRoleOptions.map((role) => role.name),
    }),
    [draft, selectedRoleOptions],
  );

  const handleOpenRolePicker = React.useCallback(() => {
    setRolePickerSelection(draft.roleIds);
    setRolePickerOpen(true);
  }, [draft.roleIds]);

  const handleApplyRoleSelection = React.useCallback(() => {
    const nextRoleIds = Array.from(new Set(rolePickerSelection));
    setDraft((previous) => ({ ...previous, roleIds: nextRoleIds }));
    setRolePickerOpen(false);
  }, [rolePickerSelection]);

  const handleRemoveRoleId = React.useCallback((roleId: string) => {
    setDraft((previous) => ({
      ...previous,
      roleIds: previous.roleIds.filter((entry) => entry !== roleId),
    }));
  }, []);

  const handleOpenRoleDetail = React.useCallback(
    (roleId: string) => {
      router.push(withTenantPath(`${ADMIN_ROUTES.roles}/${roleId}`, tenantSlug));
    },
    [router, tenantSlug],
  );

  const handleCreate = React.useCallback(async () => {
    if (!canCreate) return;
    if (!token) {
      setError("Sessão inválida.");
      return;
    }
    if (!draft.name.trim() || !draft.email.trim() || !draft.password.trim()) {
      setError("Informe nome, e-mail e senha.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let avatarUrl: string | undefined;

      if (draft.avatarUrl instanceof File) {
        avatarUrl = (await uploadAvatar(token, draft.avatarUrl)).path;
      } else if (typeof draft.avatarUrl === "string") {
        avatarUrl = draft.avatarUrl ? stripApiUrl(draft.avatarUrl) : "";
      } else if (draft.avatarUrl === null) {
        avatarUrl = "";
      }

      const created = await dataProvider.create<AdminUserRecord>(
        adminUserDetailModuleDefinition.queryAdapters.detailDataProvider?.model ?? "admin.users",
        {
          name: draft.name.trim(),
          email: draft.email.trim(),
          password: draft.password.trim(),
          isActive: draft.isActive,
          roleIds: draft.roleIds,
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
      );
      toast({ title: "Usuário criado" });
      router.push(withTenantPath(`${ADMIN_ROUTES.users}/${created.id}`, tenantSlug));
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao criar usuário.";
      setError(message);
      toast({ variant: "destructive", title: "Falha ao criar", description: message });
    } finally {
      setSaving(false);
    }
  }, [canCreate, dataProvider, draft, router, tenantSlug, toast, token]);

  if (authLoading || userLoading || loading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Carregando usuário...</div>;
  }

  if (!canCreate) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Você não tem permissão para criar usuários.</div>;
  }

  const context: AdminUserDetailLayoutContext = {
    user: draftUserRecord,
    draft,
    roleOptions,
    selectedRoleOptions,
    canEdit: true,
    canAudit: false,
    isCreate: true,
    auditVisibleCount: 0,
    onAuditVisibleCountChange: () => undefined,
    onDraftChange: setDraft,
    onAvatarFileSelect: (file) =>
      setDraft((previous) => ({ ...previous, avatarUrl: file })),
    onOpenRolePicker: handleOpenRolePicker,
    onRemoveRoleId: handleRemoveRoleId,
    onOpenRoleDetail: handleOpenRoleDetail,
  };

  return (
    <>
      {error ? <div className="px-4 pt-4 text-sm text-destructive">{error}</div> : null}

      <DetailShellEngine<AdminUserDetailLayoutContext>
        moduleDefinition={adminUserDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={false}
        mode="create"
        headerTitle={draft.name.trim() || "Novo usuário"}
        saving={saving}
        readOnly={false}
        onSave={() => void handleCreate()}
        onClose={() => router.push(withTenantPath(ADMIN_ROUTES.users, tenantSlug))}
        breadcrumbTitle="Novo usuário"
        breadcrumbItems={[
          { label: "Geral", href: ADMIN_ROUTES.overview },
          { label: "Usuários", href: ADMIN_ROUTES.users },
          { label: "Novo usuário" },
        ]}
      />

      <DetailRelationItemDialog
        open={rolePickerOpen}
        onOpenChange={setRolePickerOpen}
        title="Vincular perfis"
        onSave={handleApplyRoleSelection}
        saveLabel="Aplicar"
      >
        <CompactMultiSelect
          options={roleOptions.map((role) => ({
            value: role.id,
            label: role.name,
            description: role.description,
          }))}
          selectedValues={rolePickerSelection}
          onChange={setRolePickerSelection}
          label="Perfis"
          placeholder="Selecionar perfis"
          emptyLabel="Nenhum perfil selecionado."
        />
      </DetailRelationItemDialog>
    </>
  );
}
