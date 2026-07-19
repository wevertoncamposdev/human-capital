"use client";

import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import {
  ADMIN_AUDIT_ACTION_OPTIONS,
} from "@/modules/core/admin/admin.constants";
import type {
  AdminAuditRecord,
  AdminPermissionRecord,
  AdminRoleRecord,
  AdminSettingsOverviewRecord,
  AdminTenantRecord,
  AdminUserRecord,
} from "@/modules/core/admin/admin.types";
import {
  createUser,
  deleteRole,
  deleteUser,
  getAuditLogById,
  getAuditLogs,
  getRoleById,
  getUserById,
  listPermissions,
  listRoles,
  listUsers,
  resetUserMfa,
  type AdminAuditLog,
  type PermissionSummary,
  type RoleSummary,
  updateRole,
  updateUser,
  createRole,
} from "@/features/admin/api";
import { getTenantProfile, updateTenantProfile } from "@/features/auth/api";
import { RBAC_MODULE_LABELS, splitPermissionKey } from "@/features/admin/config/rbac.constants";
import { matchesDomainRecord, includesFoldedText } from "@/web-client/domain/evaluate";

type PagedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

async function fetchAllPaged<T>(
  loadPage: (page: number, limit: number) => Promise<PagedResponse<T>>,
  limit = 200,
) {
  const firstPage = await loadPage(1, limit);
  const all = [...firstPage.data];

  for (let page = 2; page <= Math.max(firstPage.pagination.pages, 1); page += 1) {
    const nextPage = await loadPage(page, limit);
    all.push(...nextPage.data);
  }

  return all;
}

function paginateLocalResults<T>(rows: T[], args: SearchArgs): SearchResult<T> {
  if (args.all || !args.pagination) {
    const limit = rows.length || 1;
    return {
      data: rows,
      pagination: {
        page: 1,
        limit,
        total: rows.length,
        pages: rows.length ? 1 : 0,
      },
    };
  }

  const pageIndex = Math.max(args.pagination.pageIndex ?? 0, 0);
  const pageSize = Math.max(args.pagination.pageSize ?? 20, 1);
  const total = rows.length;
  const pages = total ? Math.ceil(total / pageSize) : 0;
  const start = pageIndex * pageSize;

  return {
    data: rows.slice(start, start + pageSize),
    pagination: {
      page: Math.min(pageIndex + 1, Math.max(pages, 1)),
      limit: pageSize,
      total,
      pages,
    },
  };
}

function mapAdminUserRecord(user: Awaited<ReturnType<typeof getUserById>>): AdminUserRecord {
  const roles = Array.isArray((user as { roles?: unknown }).roles)
    ? ((user as { roles: AdminUserRecord["roles"] }).roles ?? [])
    : [];

  return {
    ...(user as AdminUserRecord),
    roleIds: roles.map((role) => role.id),
    roleNames: roles.map((role) => role.name),
  };
}

function mapAdminRoleRecord(role: RoleSummary): AdminRoleRecord {
  const moduleKeys = Array.from(
    new Set(
      role.permissions
        .map((permission) => splitPermissionKey(permission.key)?.moduleKey)
        .filter(Boolean) as string[],
    ),
  ).sort((left, right) => left.localeCompare(right));

  return {
    ...role,
    permissionKeys: role.permissions.map((permission) => permission.key),
    modules: moduleKeys.map((key) => RBAC_MODULE_LABELS[key] ?? key),
    moduleKeys,
    permissionCount: role.permissions.length,
    moduleCount: moduleKeys.length,
  };
}

function mapPermissionRecord(permission: PermissionSummary): AdminPermissionRecord {
  const parsed = splitPermissionKey(permission.key);
  const moduleKey = parsed?.moduleKey ?? "outros";
  const action = parsed?.action ?? "read";

  return {
    ...permission,
    moduleKey,
    moduleLabel: RBAC_MODULE_LABELS[moduleKey] ?? moduleKey,
    action,
  };
}

function mapAuditRecord(log: AdminAuditLog): AdminAuditRecord {
  return {
    ...log,
    userName: log.user?.name ?? "Sistema",
    userEmail: log.user?.email ?? "",
  };
}

function searchUsersLocally(rows: AdminUserRecord[], searchText: string) {
  const query = searchText.trim();
  if (!query) return rows;

  return rows.filter((row) =>
    [
      row.name,
      row.email,
      row.phone,
      row.bio,
      row.isActive ? "Ativo" : "Inativo",
      ...row.roleNames,
    ].some((entry) => includesFoldedText(entry, query)),
  );
}

function searchRolesLocally(rows: AdminRoleRecord[], searchText: string) {
  const query = searchText.trim();
  if (!query) return rows;

  return rows.filter((row) =>
    [
      row.name,
      row.description,
      ...row.modules,
      ...row.moduleKeys,
      ...row.permissionKeys,
    ].some((entry) => includesFoldedText(entry, query)),
  );
}

function searchPermissionsLocally(rows: AdminPermissionRecord[], searchText: string) {
  const query = searchText.trim();
  if (!query) return rows;

  return rows.filter((row) =>
    [row.key, row.description, row.moduleLabel, row.moduleKey, row.action].some((entry) =>
      includesFoldedText(entry, query),
    ),
  );
}

function searchAuditLocally(rows: AdminAuditRecord[], searchText: string) {
  const query = searchText.trim();
  if (!query) return rows;

  return rows.filter((row) =>
    [
      row.entity,
      row.entityId,
      row.userName,
      row.userEmail,
      row.requestId,
      row.ipAddress,
      row.userAgent,
      ADMIN_AUDIT_ACTION_OPTIONS.find((entry) => entry.value === row.action)?.label ?? row.action,
      row.createdAt,
    ].some((entry) => includesFoldedText(entry, query)),
  );
}

function filterUsers(rows: AdminUserRecord[], args: SearchArgs) {
  const filtered = matchesDomainList(rows, args, (row, field) => {
    switch (field) {
      case "isActive":
        return row.isActive;
      case "roles":
      case "roleNames":
        return row.roleNames;
      default:
        return row[field as keyof AdminUserRecord];
    }
  });
  return searchUsersLocally(filtered, args.searchText ?? "");
}

function filterRoles(rows: AdminRoleRecord[], args: SearchArgs) {
  const filtered = matchesDomainList(rows, args, (row, field) => {
    switch (field) {
      case "modules":
        return row.modules;
      case "moduleKeys":
        return row.moduleKeys;
      case "permissionKeys":
        return row.permissionKeys;
      default:
        return row[field as keyof AdminRoleRecord];
    }
  });
  return searchRolesLocally(filtered, args.searchText ?? "");
}

function filterPermissions(rows: AdminPermissionRecord[], args: SearchArgs) {
  const filtered = matchesDomainList(rows, args);
  return searchPermissionsLocally(filtered, args.searchText ?? "");
}

function matchesDomainList<TRecord extends Record<string, unknown>>(
  rows: TRecord[],
  args: SearchArgs,
  resolveFieldValue?: (record: TRecord, field: string) => unknown,
) {
  if (!args.domain) return rows;
  return rows.filter((row) => matchesDomainRecord(row, args.domain ?? null, resolveFieldValue));
}

function resolveAuditQueryFromSearchArgs(args: SearchArgs) {
  const context = args.context ?? {};
  const rawFrom =
    typeof context.from === "string" && context.from
      ? context.from
      : typeof context.rangeFrom === "string" && context.rangeFrom
        ? context.rangeFrom
        : undefined;
  const rawTo =
    typeof context.to === "string" && context.to
      ? context.to
      : typeof context.rangeTo === "string" && context.rangeTo
        ? context.rangeTo
        : undefined;

  const action =
    typeof context.action === "string" && context.action
      ? context.action
      : undefined;
  const entity =
    typeof context.entity === "string" && context.entity.trim()
      ? context.entity.trim()
      : undefined;
  const userId =
    typeof context.userId === "string" && context.userId.trim()
      ? context.userId.trim()
      : undefined;
  const entityId =
    typeof context.entityId === "string" && context.entityId.trim()
      ? context.entityId.trim()
      : undefined;

  return {
    action,
    entity,
    entityId,
    userId,
    from: rawFrom,
    to: rawTo,
  };
}

export async function searchAdminUsers(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<AdminUserRecord>> {
  const users = await fetchAllPaged((page, limit) => listUsers(token, { page, limit }));
  const mapped = users.map((user) => mapAdminUserRecord(user as never));
  const filtered = filterUsers(mapped, args);
  return paginateLocalResults(filtered, args);
}

export async function searchAdminRoles(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<AdminRoleRecord>> {
  const roles = await listRoles(token);
  const mapped = roles.map(mapAdminRoleRecord);
  const filtered = filterRoles(mapped, args);
  return paginateLocalResults(filtered, args);
}

export async function searchAdminPermissions(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<AdminPermissionRecord>> {
  const permissions = await listPermissions(token);
  const mapped = permissions.map(mapPermissionRecord);
  const filtered = filterPermissions(mapped, args);
  return paginateLocalResults(filtered, args);
}

export async function searchAdminAuditLogs(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<AdminAuditRecord>> {
  const baseQuery = resolveAuditQueryFromSearchArgs(args);
  const logs = await fetchAllPaged((page, limit) =>
    getAuditLogs(token, {
      page,
      limit,
      action: baseQuery.action as never,
      entity: baseQuery.entity,
      entityId: baseQuery.entityId,
      userId: baseQuery.userId,
      from: baseQuery.from,
      to: baseQuery.to,
      search: args.searchText?.trim() || undefined,
    }),
  );

  let mapped = logs.map(mapAuditRecord);
  mapped = matchesDomainList(mapped, args, (row, field) => {
    switch (field) {
      case "userName":
        return row.userName;
      case "userEmail":
        return row.userEmail;
      default:
        return row[field as keyof AdminAuditRecord];
    }
  });
  mapped = searchAuditLocally(mapped, args.searchText ?? "");

  return paginateLocalResults(mapped, args);
}

export async function readAdminSettingsOverview(token: string): Promise<AdminSettingsOverviewRecord> {
  const [tenant, users, roles, permissions] = await Promise.all([
    getTenantProfile(token),
    fetchAllPaged((page, limit) => listUsers(token, { page, limit })),
    listRoles(token),
    listPermissions(token),
  ]);

  const activeUsersTotal = users.filter((user) => user.isActive).length;

  return {
    id: tenant.id,
    tenantId: tenant.id,
    name: tenant.name,
    slug: tenant.slug ?? null,
    status: tenant.status ?? null,
    cnpj: tenant.cnpj ?? null,
    startYear: tenant.startYear ?? null,
    description: tenant.description ?? null,
    createdAt: tenant.createdAt ?? null,
    updatedAt: tenant.updatedAt ?? null,
    usersTotal: users.length,
    activeUsersTotal,
    inactiveUsersTotal: Math.max(users.length - activeUsersTotal, 0),
    rolesTotal: roles.length,
    permissionsTotal: permissions.length,
  };
}

export async function readAdminTenant(token: string): Promise<AdminTenantRecord> {
  return getTenantProfile(token);
}

export async function readAdminUser(token: string, id: string): Promise<AdminUserRecord> {
  const user = await getUserById(token, id);
  return mapAdminUserRecord(user as never);
}

export async function readAdminRole(token: string, id: string): Promise<AdminRoleRecord> {
  const role = await getRoleById(token, id);
  return mapAdminRoleRecord(role);
}

export async function readAdminAuditLog(token: string, id: string): Promise<AdminAuditRecord> {
  const log = await getAuditLogById(token, id);
  return mapAuditRecord(log);
}

export async function createAdminUser(
  token: string,
  payload: {
    name: string;
    email: string;
    password: string;
    isActive?: boolean;
    roleIds?: string[];
    avatarUrl?: string;
  },
) {
  const user = await createUser(token, payload);
  return mapAdminUserRecord(user as never);
}

export async function updateAdminUser(
  token: string,
  userId: string,
  payload: {
    name?: string;
    email?: string;
    password?: string;
    isActive?: boolean;
    roleIds?: string[];
    avatarUrl?: string;
  },
) {
  const user = await updateUser(token, userId, payload);
  return mapAdminUserRecord(user as never);
}

export async function resetAdminUserMfa(token: string, userId: string) {
  const user = await resetUserMfa(token, userId);
  return mapAdminUserRecord(user as never);
}

export async function createAdminRole(
  token: string,
  payload: {
    name: string;
    description?: string;
    permissionKeys?: string[];
  },
) {
  const role = await createRole(token, payload);
  return mapAdminRoleRecord(role);
}

export async function updateAdminRole(
  token: string,
  roleId: string,
  payload: {
    name?: string;
    description?: string;
    permissionKeys?: string[];
  },
) {
  const role = await updateRole(token, roleId, payload);
  return mapAdminRoleRecord(role);
}

export async function updateAdminTenant(
  token: string,
  payload: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    cnpj?: string;
    startYear?: number;
    description?: string;
  },
) {
  return updateTenantProfile(token, payload);
}

export {
  deleteRole as deleteAdminRole,
  deleteUser as deleteAdminUser,
};
