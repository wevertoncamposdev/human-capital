"use client";

import type {
  AdminAuditLog,
  AdminUser,
  AdminUserRole,
  PermissionSummary,
  RolePermission,
  RoleSummary,
} from "@/features/admin/api";
import type { TenantProfile } from "@/features/auth/api";

export type AdminSettingsOverviewRecord = {
  id: string;
  tenantId: string;
  name: string;
  slug?: string | null;
  status?: string | null;
  cnpj?: string | null;
  startYear?: number | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  usersTotal: number;
  activeUsersTotal: number;
  inactiveUsersTotal: number;
  rolesTotal: number;
  permissionsTotal: number;
};

export type AdminTenantRecord = TenantProfile;

export type AdminUserRecord = AdminUser & {
  phone?: string | null;
  bio?: string | null;
  mfaTotpEnabled?: boolean;
  roleIds: string[];
  roleNames: string[];
};

export type AdminRoleRecord = RoleSummary & {
  permissionKeys: string[];
  modules: string[];
  moduleKeys: string[];
  permissionCount: number;
  moduleCount: number;
};

export type AdminPermissionRecord = PermissionSummary & {
  moduleKey: string;
  moduleLabel: string;
  action: string;
};

export type AdminAuditRecord = AdminAuditLog & {
  userName: string;
  userEmail: string;
};

export type AdminUserFormDraft = {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  roleIds: string[];
  avatarUrl: string | File | null;
};

export type AdminRoleFormDraft = {
  name: string;
  description: string;
  permissionKeys: string[];
};

export type AdminTenantFormDraft = {
  name: string;
  slug: string;
  cnpj: string;
  startYear: string;
  description: string;
  logoUrl: string | null;
  logoFile?: File | null;
};

export type AdminUserRoleOption = AdminUserRole;
export type AdminRolePermissionOption = RolePermission;
