"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { AdminSettingsHeader } from "@/modules/core/features/settings/ui/admin-settings-header";
import { useAdminUser } from "@/modules/core/features/admin-users/data/use-admin-user";
import { useAdminUserAccessLogs } from "@/modules/core/features/admin-users/data/use-admin-user-access-logs";
import { useAdminUserAuditLogs } from "@/modules/core/features/admin-users/data/use-admin-user-audit-logs";
import { AdminUserRegistrationCard } from "@/modules/core/features/admin-users/ui/admin-user-registration-card";
import { AdminUserAccessLogsCard } from "@/modules/core/features/admin-users/ui/admin-user-access-logs-card";
import { AdminUserRecentActionsCard } from "@/modules/core/features/admin-users/ui/admin-user-recent-actions-card";

export function AdminUserDetailClientPage({ userId }: { userId: string }) {
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const canReadUsers = permissions.includes("users.read");
  const canReadAudit = permissions.includes("audit.read");
  const enabled = Boolean(token && isAuthenticated && !authLoading);

  const userState = useAdminUser({
    token: token ?? null,
    userId,
    enabled: enabled && canReadUsers,
  });

  const accessLogsState = useAdminUserAccessLogs({
    token: token ?? null,
    userId,
    enabled: enabled && canReadUsers,
  });

  const auditLogsState = useAdminUserAuditLogs({
    token: token ?? null,
    userId,
    enabled: enabled && canReadAudit,
  });

  if (!canReadUsers) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Você não tem permissão para acessar esta área.
      </div>
    );
  }

  const auditHref =
    withTenantPath("/admin/audit-logs", tenantSlug) + `?userId=${userId}`;

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <AdminSettingsHeader title="Configurações • Usuários" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {userState.user?.name || userState.user?.email || "Usuário"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {userState.user?.email ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(withTenantPath("/admin/users", tenantSlug))}
          >
            Voltar
          </Button>
        </div>
      </div>

      <AdminUserRegistrationCard
        user={userState.user}
        loading={userState.loading}
        error={userState.error}
        onRefresh={userState.reload}
      />

      <AdminUserAccessLogsCard
        columns={accessLogsState.columns}
        rows={accessLogsState.rows}
        loading={accessLogsState.loading}
        error={accessLogsState.error}
        pageCount={accessLogsState.pageCount}
        totalCount={accessLogsState.totalCount}
        pagination={accessLogsState.pagination}
        onPaginationChange={accessLogsState.setPagination}
        onSearchChange={accessLogsState.setSearch}
        onRefresh={accessLogsState.reload}
      />

      {canReadAudit ? (
        <AdminUserRecentActionsCard
          logs={auditLogsState.logs}
          loading={auditLogsState.loading}
          error={auditLogsState.error}
          auditHref={auditHref}
          canLoadMore={auditLogsState.page < auditLogsState.pages}
          onLoadMore={auditLogsState.loadMore}
          onRefresh={() => auditLogsState.reload("replace", 1)}
        />
      ) : null}
    </div>
  );
}
