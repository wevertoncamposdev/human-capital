"use client";

import {
  ADMIN_ACTION_IDS,
  ADMIN_ROUTES,
} from "@/modules/core/admin/admin.constants";
import {
  adminAuditListModuleDefinition,
  adminAuditDetailModuleDefinition,
  adminInstitutionModuleDefinition,
  adminOverviewModuleDefinition,
  adminPermissionsListModuleDefinition,
  adminRoleDetailModuleDefinition,
  adminRolesListModuleDefinition,
  adminUserDetailModuleDefinition,
  adminUsersListModuleDefinition,
} from "@/modules/core/admin/config/admin-module-contract";
import { AdminAuditDetailEngineClientPage } from "@/modules/core/admin/ui/admin-audit-detail-engine-client-page";
import { AdminAuditListModuleClientPage } from "@/modules/core/admin/ui/admin-audit-list-module-client-page";
import { AdminInstitutionDetailClientPage } from "@/modules/core/admin/ui/admin-institution-detail-client-page";
import { AdminOverviewClientPage } from "@/modules/core/admin/ui/admin-overview-client-page";
import { AdminPermissionsListModuleClientPage } from "@/modules/core/admin/ui/admin-permissions-list-module-client-page";
import { AdminRoleCreatePage } from "@/modules/core/admin/ui/admin-role-create-page";
import { AdminRoleDetailEngineClientPage } from "@/modules/core/admin/ui/admin-role-detail-engine-client-page";
import { AdminRolesListModuleClientPage } from "@/modules/core/admin/ui/admin-roles-list-module-client-page";
import { AdminUserCreatePage } from "@/modules/core/admin/ui/admin-user-create-page";
import { AdminUserDetailEngineClientPage } from "@/modules/core/admin/ui/admin-user-detail-engine-client-page";
import { AdminUsersListModuleClientPage } from "@/modules/core/admin/ui/admin-users-list-module-client-page";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const adminOverviewAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.overview,
  moduleDefinition: adminOverviewModuleDefinition,
  titleVariant: "detail",
  breadcrumbs: [{ label: "Geral", href: ADMIN_ROUTES.overview }],
  hideBreadcrumb: true,
  render: () => <AdminOverviewClientPage />,
});

export const adminInstitutionAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.institution,
  moduleDefinition: adminInstitutionModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Geral", href: ADMIN_ROUTES.overview }],
  hideBreadcrumb: true,
  render: () => <AdminInstitutionDetailClientPage />,
});

export const adminUsersListAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.usersList,
  moduleDefinition: adminUsersListModuleDefinition,
  titleVariant: "list",
  breadcrumbs: [{ label: "Usuarios", href: ADMIN_ROUTES.users }],
  render: () => <AdminUsersListModuleClientPage />,
});

export const adminUsersDetailAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.usersDetail,
  moduleDefinition: adminUserDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Usuarios", href: ADMIN_ROUTES.users }],
  hideBreadcrumb: true,
  render: () => <AdminUserDetailEngineClientPage />,
});

export const adminUsersCreateAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.usersCreate,
  moduleDefinition: adminUserDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [{ label: "Usuarios", href: ADMIN_ROUTES.users }],
  hideBreadcrumb: true,
  render: () => <AdminUserCreatePage />,
});

export const adminRolesListAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.rolesList,
  moduleDefinition: adminRolesListModuleDefinition,
  titleVariant: "list",
  breadcrumbs: [{ label: "Perfis", href: ADMIN_ROUTES.roles }],
  render: () => <AdminRolesListModuleClientPage />,
});

export const adminRolesDetailAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.rolesDetail,
  moduleDefinition: adminRoleDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Perfis", href: ADMIN_ROUTES.roles }],
  hideBreadcrumb: true,
  render: () => <AdminRoleDetailEngineClientPage />,
});

export const adminRolesCreateAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.rolesCreate,
  moduleDefinition: adminRoleDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [{ label: "Perfis", href: ADMIN_ROUTES.roles }],
  hideBreadcrumb: true,
  render: () => <AdminRoleCreatePage />,
});

export const adminPermissionsListAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.permissionsList,
  moduleDefinition: adminPermissionsListModuleDefinition,
  titleVariant: "list",
  breadcrumbs: [{ label: "Permissoes", href: ADMIN_ROUTES.permissions }],
  render: () => <AdminPermissionsListModuleClientPage />,
});

export const adminAuditListAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.auditList,
  moduleDefinition: adminAuditListModuleDefinition,
  titleVariant: "list",
  breadcrumbs: [{ label: "Auditoria", href: ADMIN_ROUTES.audit }],
  render: () => <AdminAuditListModuleClientPage />,
});

export const adminAuditDetailAction = createModuleWindowAction({
  id: ADMIN_ACTION_IDS.auditDetail,
  moduleDefinition: adminAuditDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Auditoria", href: ADMIN_ROUTES.audit }],
  hideBreadcrumb: true,
  render: () => <AdminAuditDetailEngineClientPage />,
});
