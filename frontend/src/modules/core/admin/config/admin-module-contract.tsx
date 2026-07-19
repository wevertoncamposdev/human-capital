"use client";

import * as React from "react";
import { BarChart3, CalendarDays, Clock3, LayoutGrid } from "lucide-react";
import type { Domain } from "@/web-client/domain/types";
import {
  adminAuditSearchView,
  adminPermissionsSearchView,
  adminRolesSearchView,
  adminSingletonSearchView,
  adminUsersSearchView,
} from "@/web-client/registry/searchViews/admin";
import {
  defineRecordModule,
  type CalendarMode,
  type GraphBuilderState,
  type RecordModuleActionMap,
  type RecordModuleDefinition,
  type SortDirection,
} from "@/web-client/registry/types";
import {
  createStandardDetailQueryState,
  createStandardDetailView,
  createStandardFeatureFlags,
  createStandardListQueryState,
  createStandardListView,
} from "@/web-client/starter";
import { ADMIN_ROUTES } from "@/modules/core/admin/admin.constants";
import { ADMIN_SETTINGS_PERMISSIONS } from "@/modules/core/features/settings/domain/admin-settings-access";
import {
  adminOverviewLayout,
  adminAuditDetailLayout,
  adminRoleDetailLayout,
  adminTenantDetailLayout,
  adminUserDetailLayout,
  type AdminAuditDetailLayoutContext,
  type AdminOverviewLayoutContext,
  type AdminRoleDetailLayoutContext,
  type AdminTenantLayoutContext,
  type AdminUserDetailLayoutContext,
} from "@/modules/core/admin/config/admin-detail-layouts";

export type AdminCollectionQueryState<TView extends string = string> = {
  view: TView;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  timelineField: string;
  timelineSortDirection: SortDirection;
  calendarField: string;
  calendarMode: CalendarMode;
  rangeFrom: string;
  rangeTo: string;
  graph: GraphBuilderState;
};

export type AdminDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export type AdminAuditDetailQueryState = AdminDetailQueryState;

export type AdminUsersListViewId = "list" | "kanban" | "timeline" | "calendar" | "graph";
export type AdminRolesListViewId = "list" | "timeline" | "calendar" | "graph";
export type AdminPermissionsListViewId = "list" | "graph";
export type AdminAuditListViewId = "list" | "timeline" | "calendar" | "graph";

export type AdminUsersListQueryState = AdminCollectionQueryState<AdminUsersListViewId>;
export type AdminRolesListQueryState = AdminCollectionQueryState<AdminRolesListViewId>;
export type AdminPermissionsListQueryState =
  AdminCollectionQueryState<AdminPermissionsListViewId>;
export type AdminAuditListQueryState = AdminCollectionQueryState<AdminAuditListViewId>;

const ADMIN_OVERVIEW_PERMISSIONS = {
  canRead: {
    anyOf: [...ADMIN_SETTINGS_PERMISSIONS],
  },
};

const ADMIN_TENANT_PERMISSIONS = {
  canRead: {
    anyOf: ["tenants.read", "tenants.update"],
  },
  canEdit: "tenants.update",
  canAudit: "audit.read",
};

const ADMIN_USERS_PERMISSIONS = {
  canRead: "users.read",
  canCreate: "users.create",
  canEdit: "users.update",
  canDelete: "users.delete",
  canAudit: "audit.read",
  canExport: "users.read",
};

const ADMIN_ROLES_PERMISSIONS = {
  canRead: "roles.manage",
  canCreate: "roles.manage",
  canEdit: "roles.manage",
  canDelete: "roles.manage",
  canAudit: "audit.read",
  canExport: "roles.manage",
};

const ADMIN_PERMISSIONS_PERMISSIONS = {
  canRead: "roles.manage",
  canExport: "roles.manage",
};

const ADMIN_AUDIT_PERMISSIONS = {
  canRead: "audit.read",
  canExport: "audit.read",
};

const STANDARD_LIST_ACTIONS: RecordModuleActionMap = {
  create: {
    key: "create",
    label: "Novo registro",
    permissionKey: "canCreate",
    scope: "list",
  },
  view: {
    key: "view",
    label: "Abrir",
    permissionKey: "canRead",
    scope: "row",
    requiresReturnTo: true,
  },
  refresh: {
    key: "refresh",
    label: "Atualizar",
    permissionKey: "canRead",
    scope: "list",
  },
};

const STANDARD_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo registro",
    permissionKey: "canCreate",
    scope: "detail",
  },
  edit: {
    key: "edit",
    label: "Salvar alteracoes",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir",
    permissionKey: "canDelete",
    scope: "detail",
  },
  audit: {
    key: "audit",
    label: "Auditoria",
    permissionKey: "canAudit",
    scope: "detail",
  },
};

const overviewFieldMap = {
  name: { label: "Instituicao" },
  slug: { label: "Slug" },
  status: { label: "Status" },
  cnpj: { label: "CNPJ" },
  startYear: { label: "Ano de inicio" },
  description: { label: "Descricao" },
  usersTotal: { label: "Usuarios" },
  activeUsersTotal: { label: "Usuarios ativos" },
  inactiveUsersTotal: { label: "Usuarios inativos" },
  rolesTotal: { label: "Perfis" },
  permissionsTotal: { label: "Permissoes" },
  createdAt: { label: "Criado em", type: "date" },
  updatedAt: { label: "Atualizado em", type: "date" },
};

const tenantFieldMap = {
  name: { label: "Instituicao" },
  slug: { label: "Slug" },
  logoUrl: { label: "Logo" },
  cnpj: { label: "CNPJ" },
  startYear: { label: "Ano de inicio", type: "number" },
  description: { label: "Descricao" },
  status: { label: "Status" },
  createdAt: { label: "Criado em", type: "date" },
  updatedAt: { label: "Atualizado em", type: "date" },
};

const userFieldMap = {
  name: { label: "Nome" },
  email: { label: "Email" },
  phone: { label: "Telefone" },
  bio: { label: "Bio" },
  isActive: { label: "Status", type: "boolean" },
  roleNames: { label: "Perfis" },
  mfaTotpEnabled: { label: "MFA", type: "boolean" },
  createdAt: { label: "Criado em", type: "date" },
  updatedAt: { label: "Atualizado em", type: "date" },
};

const roleFieldMap = {
  name: { label: "Perfil" },
  description: { label: "Descricao" },
  modules: { label: "Modulos" },
  permissionKeys: { label: "Permissoes" },
  permissionCount: { label: "Qtd. permissoes", type: "number" },
  moduleCount: { label: "Qtd. modulos", type: "number" },
  createdAt: { label: "Criado em", type: "date" },
  updatedAt: { label: "Atualizado em", type: "date" },
};

const permissionFieldMap = {
  key: { label: "Chave" },
  description: { label: "Descricao" },
  moduleKey: { label: "Modulo" },
  moduleLabel: { label: "Modulo" },
  action: { label: "Acao" },
  createdAt: { label: "Criado em", type: "date" },
  updatedAt: { label: "Atualizado em", type: "date" },
};

const auditFieldMap = {
  action: { label: "Acao" },
  entity: { label: "Entidade" },
  entityId: { label: "ID da entidade" },
  userName: { label: "Usuario" },
  userEmail: { label: "Email" },
  ipAddress: { label: "IP" },
  requestId: { label: "Request ID" },
  createdAt: { label: "Data", type: "date" },
};

export const adminOverviewModuleDefinition = defineRecordModule<
  AdminDetailQueryState,
  AdminOverviewLayoutContext
>({
  moduleId: "admin.overview.detail",
  basePath: ADMIN_ROUTES.overview,
  featureFlags: createStandardFeatureFlags({ detail: true }),
  actionKey: "admin.overview.screen",
  favoriteKey: "admin.overview.favorites",
  permissions: ADMIN_OVERVIEW_PERMISSIONS,
  actions: {
    view: {
      key: "view",
      label: "Visao geral",
      permissionKey: "canRead",
      scope: "detail",
    },
  },
  queryAdapters: {
    listDataProvider: { model: "admin.settings" },
    detailDataProvider: { model: "admin.settings" },
  },
  domainAdapter: {
    entity: { singular: "Visao geral", plural: "Configuracoes" },
    detail: {
      fallbackTitle: "Configuracoes",
    },
    fields: overviewFieldMap,
  },
  searchConfig: adminSingletonSearchView,
  views: [createStandardDetailView()],
  defaultView: "detail",
  defaultQueryState: createStandardDetailQueryState<AdminDetailQueryState>(),
  detailLayout: adminOverviewLayout,
});

export const adminInstitutionModuleDefinition = defineRecordModule<
  AdminDetailQueryState,
  AdminTenantLayoutContext
>({
  moduleId: "admin.tenant.detail",
  basePath: ADMIN_ROUTES.institution,
  featureFlags: createStandardFeatureFlags({
    detail: true,
    audit: true,
  }),
  actionKey: "admin.institution.screen",
  favoriteKey: "admin.institution.favorites",
  permissions: ADMIN_TENANT_PERMISSIONS,
  actions: STANDARD_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "admin.tenant" },
    detailDataProvider: { model: "admin.tenant" },
    auditDataProvider: { model: "audit.logs" },
  },
  domainAdapter: {
    entity: { singular: "Instituicao", plural: "Instituicao" },
    detail: {
      fallbackTitle: "Instituicao",
      createTitle: "Instituicao",
    },
    fields: tenantFieldMap,
  },
  searchConfig: adminSingletonSearchView,
  views: [createStandardDetailView()],
  defaultView: "detail",
  defaultQueryState: createStandardDetailQueryState<AdminDetailQueryState>(),
  detailLayout: adminTenantDetailLayout,
});

export const adminUsersListModuleDefinition = defineRecordModule<AdminUsersListQueryState>({
  moduleId: "admin.users.list",
  basePath: ADMIN_ROUTES.users,
  featureFlags: createStandardFeatureFlags({
    list: true,
    kanban: true,
    timeline: true,
    calendar: true,
    graph: true,
    export: true,
  }),
  actionKey: "admin.users.list.screen",
  favoriteKey: "admin.users.list.favorites",
  permissions: ADMIN_USERS_PERMISSIONS,
  actions: {
    ...STANDARD_LIST_ACTIONS,
    create: {
      ...STANDARD_LIST_ACTIONS.create!,
      label: "Novo usuario",
    },
    view: {
      ...STANDARD_LIST_ACTIONS.view!,
      label: "Abrir usuario",
    },
  },
  queryAdapters: {
    listDataProvider: { model: "admin.users" },
    detailDataProvider: { model: "admin.users" },
  },
  domainAdapter: {
    entity: { singular: "Usuario", plural: "Usuarios" },
    list: {
      searchPlaceholder: "Pesquisar usuarios",
      createActionLabel: "Novo usuario",
      totalLabel: "Total",
      emptyStateLabel: "Nenhum usuario encontrado.",
    },
    detail: {
      createTitle: "Novo usuario",
      fallbackTitle: "Usuario",
    },
    fields: userFieldMap,
  },
  searchConfig: adminUsersSearchView,
  views: [
    createStandardListView({
      params: {
        searchable: true,
        sortable: true,
        paginated: true,
        sortFields: ["name", "email", "createdAt", "updatedAt"],
      },
    }),
    {
      id: "kanban",
      title: "Kanban",
      viewType: "kanban",
      icon: <LayoutGrid className="size-4" />,
      params: {
        columnField: "isActive",
        titleField: "name",
        groupByFields: ["isActive", "roleNames"],
        defaultGroupByField: "isActive",
      },
    },
    {
      id: "timeline",
      title: "Timeline",
      viewType: "timeline",
      icon: <Clock3 className="size-4" />,
      params: {
        startDateField: "createdAt",
        titleField: "name",
        dateFields: ["createdAt", "updatedAt"],
        defaultDateField: "createdAt",
        sortDirections: ["desc", "asc"],
        defaultSortDirection: "desc",
      },
    },
    {
      id: "calendar",
      title: "Calendario",
      viewType: "calendar",
      icon: <CalendarDays className="size-4" />,
      params: {
        startDateField: "createdAt",
        titleField: "name",
        dateFields: ["createdAt", "updatedAt"],
        defaultDateField: "createdAt",
        modes: ["day", "week", "month", "year"],
        defaultMode: "month",
      },
    },
    {
      id: "graph",
      title: "Grafico",
      viewType: "graph",
      icon: <BarChart3 className="size-4" />,
      params: {
        builder: {
          fields: [
            { field: "isActive", label: "Status", kind: "dimension", formatValue: (value) => (value ? "Ativo" : "Inativo") },
            { field: "roleNames", label: "Perfis", kind: "dimension", emptyValueLabel: "Sem perfil" },
            { field: "mfaTotpEnabled", label: "MFA", kind: "dimension", formatValue: (value) => (value ? "Ativo" : "Inativo") },
            { field: "createdAt", label: "Criado em", kind: "date" },
            { field: "updatedAt", label: "Atualizado em", kind: "date" },
          ],
          defaultState: {
            groupBy: "isActive",
            metric: { field: null, op: "count" },
            timeField: null,
            timeBucket: null,
            chartType: "bar",
            filters: {},
          },
          maxGroups: 10,
          downloadFileName: "usuarios",
        },
      },
    },
  ],
  defaultView: "list",
  defaultQueryState: createStandardListQueryState<AdminUsersListQueryState>({
    pageSize: 20,
    timelineField: "createdAt",
    timelineSortDirection: "desc",
    calendarField: "createdAt",
    calendarMode: "month",
    rangeFrom: "",
    rangeTo: "",
    graph: {
      groupBy: "isActive",
      metric: { field: null, op: "count" },
      timeField: null,
      timeBucket: null,
      chartType: "bar",
      filters: {},
    },
  }),
});

export const adminUserDetailModuleDefinition = defineRecordModule<
  AdminDetailQueryState,
  AdminUserDetailLayoutContext
>({
  moduleId: "admin.users.detail",
  basePath: ADMIN_ROUTES.users,
  featureFlags: createStandardFeatureFlags({
    detail: true,
    audit: true,
  }),
  actionKey: "admin.users.detail.screen",
  favoriteKey: "admin.users.detail.favorites",
  permissions: ADMIN_USERS_PERMISSIONS,
  actions: {
    ...STANDARD_DETAIL_ACTIONS,
    create: {
      ...STANDARD_DETAIL_ACTIONS.create!,
      label: "Novo usuario",
    },
  },
  queryAdapters: {
    listDataProvider: { model: "admin.users" },
    detailDataProvider: { model: "admin.users" },
    auditDataProvider: { model: "audit.logs" },
  },
  domainAdapter: {
    entity: { singular: "Usuario", plural: "Usuarios" },
    detail: {
      createTitle: "Novo usuario",
      fallbackTitle: "Usuario",
    },
    fields: userFieldMap,
  },
  searchConfig: adminUsersSearchView,
  views: [createStandardDetailView()],
  defaultView: "detail",
  defaultQueryState: createStandardDetailQueryState<AdminDetailQueryState>(),
  detailLayout: adminUserDetailLayout,
});

export const adminRolesListModuleDefinition = defineRecordModule<AdminRolesListQueryState>({
  moduleId: "admin.roles.list",
  basePath: ADMIN_ROUTES.roles,
  featureFlags: createStandardFeatureFlags({
    list: true,
    timeline: true,
    calendar: true,
    graph: true,
    export: true,
  }),
  actionKey: "admin.roles.list.screen",
  favoriteKey: "admin.roles.list.favorites",
  permissions: ADMIN_ROLES_PERMISSIONS,
  actions: {
    ...STANDARD_LIST_ACTIONS,
    create: {
      ...STANDARD_LIST_ACTIONS.create!,
      label: "Novo perfil",
    },
    view: {
      ...STANDARD_LIST_ACTIONS.view!,
      label: "Abrir perfil",
    },
  },
  queryAdapters: {
    listDataProvider: { model: "admin.roles" },
    detailDataProvider: { model: "admin.roles" },
  },
  domainAdapter: {
    entity: { singular: "Perfil", plural: "Perfis" },
    list: {
      searchPlaceholder: "Pesquisar perfis",
      createActionLabel: "Novo perfil",
      totalLabel: "Total",
      emptyStateLabel: "Nenhum perfil encontrado.",
    },
    detail: {
      createTitle: "Novo perfil",
      fallbackTitle: "Perfil",
    },
    fields: roleFieldMap,
  },
  searchConfig: adminRolesSearchView,
  views: [
    createStandardListView({
      params: {
        searchable: true,
        sortable: true,
        paginated: true,
        sortFields: ["name", "permissionCount", "moduleCount", "createdAt"],
      },
    }),
    {
      id: "timeline",
      title: "Timeline",
      viewType: "timeline",
      icon: <Clock3 className="size-4" />,
      params: {
        startDateField: "createdAt",
        titleField: "name",
        dateFields: ["createdAt", "updatedAt"],
        defaultDateField: "createdAt",
        sortDirections: ["desc", "asc"],
        defaultSortDirection: "desc",
      },
    },
    {
      id: "calendar",
      title: "Calendario",
      viewType: "calendar",
      icon: <CalendarDays className="size-4" />,
      params: {
        startDateField: "createdAt",
        titleField: "name",
        dateFields: ["createdAt", "updatedAt"],
        defaultDateField: "createdAt",
        modes: ["day", "week", "month", "year"],
        defaultMode: "month",
      },
    },
    {
      id: "graph",
      title: "Grafico",
      viewType: "graph",
      icon: <BarChart3 className="size-4" />,
      params: {
        builder: {
          fields: [
            { field: "modules", label: "Modulos", kind: "dimension", emptyValueLabel: "Sem modulo" },
            { field: "moduleCount", label: "Qtd. modulos", kind: "dimension" },
            { field: "permissionCount", label: "Qtd. permissoes", kind: "metric" },
            { field: "createdAt", label: "Criado em", kind: "date" },
            { field: "updatedAt", label: "Atualizado em", kind: "date" },
          ],
          defaultState: {
            groupBy: "modules",
            metric: { field: null, op: "count" },
            timeField: null,
            timeBucket: null,
            chartType: "bar",
            filters: {},
          },
          maxGroups: 12,
          downloadFileName: "perfis",
        },
      },
    },
  ],
  defaultView: "list",
  defaultQueryState: createStandardListQueryState<AdminRolesListQueryState>({
    pageSize: 20,
    timelineField: "createdAt",
    timelineSortDirection: "desc",
    calendarField: "createdAt",
    calendarMode: "month",
    rangeFrom: "",
    rangeTo: "",
    graph: {
      groupBy: "modules",
      metric: { field: null, op: "count" },
      timeField: null,
      timeBucket: null,
      chartType: "bar",
      filters: {},
    },
  }),
});

export const adminRoleDetailModuleDefinition = defineRecordModule<
  AdminDetailQueryState,
  AdminRoleDetailLayoutContext
>({
  moduleId: "admin.roles.detail",
  basePath: ADMIN_ROUTES.roles,
  featureFlags: createStandardFeatureFlags({
    detail: true,
    audit: true,
  }),
  actionKey: "admin.roles.detail.screen",
  favoriteKey: "admin.roles.detail.favorites",
  permissions: ADMIN_ROLES_PERMISSIONS,
  actions: {
    ...STANDARD_DETAIL_ACTIONS,
    create: {
      ...STANDARD_DETAIL_ACTIONS.create!,
      label: "Novo perfil",
    },
  },
  queryAdapters: {
    listDataProvider: { model: "admin.roles" },
    detailDataProvider: { model: "admin.roles" },
    auditDataProvider: { model: "audit.logs" },
  },
  domainAdapter: {
    entity: { singular: "Perfil", plural: "Perfis" },
    detail: {
      createTitle: "Novo perfil",
      fallbackTitle: "Perfil",
    },
    fields: roleFieldMap,
  },
  searchConfig: adminRolesSearchView,
  views: [createStandardDetailView()],
  defaultView: "detail",
  defaultQueryState: createStandardDetailQueryState<AdminDetailQueryState>(),
  detailLayout: adminRoleDetailLayout,
});

export const adminPermissionsListModuleDefinition = defineRecordModule<AdminPermissionsListQueryState>({
  moduleId: "admin.permissions.list",
  basePath: ADMIN_ROUTES.permissions,
  featureFlags: createStandardFeatureFlags({
    list: true,
    graph: true,
    export: true,
  }),
  actionKey: "admin.permissions.list.screen",
  favoriteKey: "admin.permissions.list.favorites",
  permissions: ADMIN_PERMISSIONS_PERMISSIONS,
  actions: {
    view: {
      key: "view",
      label: "Visualizar permissoes",
      permissionKey: "canRead",
      scope: "list",
    },
    refresh: STANDARD_LIST_ACTIONS.refresh,
  },
  queryAdapters: {
    listDataProvider: { model: "admin.permissions" },
  },
  domainAdapter: {
    entity: { singular: "Permissao", plural: "Permissoes" },
    list: {
      searchPlaceholder: "Pesquisar permissoes",
      totalLabel: "Total",
      emptyStateLabel: "Nenhuma permissao encontrada.",
    },
    fields: permissionFieldMap,
  },
  searchConfig: adminPermissionsSearchView,
  views: [
    createStandardListView({
      params: {
        searchable: true,
        sortable: true,
        paginated: true,
        sortFields: ["key", "moduleKey", "action"],
      },
    }),
    {
      id: "graph",
      title: "Grafico",
      viewType: "graph",
      icon: <BarChart3 className="size-4" />,
      params: {
        builder: {
          fields: [
            { field: "moduleKey", label: "Modulo", kind: "dimension" },
            { field: "action", label: "Acao", kind: "dimension" },
          ],
          defaultState: {
            groupBy: "moduleKey",
            metric: { field: null, op: "count" },
            timeField: null,
            timeBucket: null,
            chartType: "bar",
            filters: {},
          },
          maxGroups: 16,
          downloadFileName: "permissoes",
        },
      },
    },
  ],
  defaultView: "list",
  defaultQueryState: createStandardListQueryState<AdminPermissionsListQueryState>({
    pageSize: 20,
    timelineField: "createdAt",
    timelineSortDirection: "desc",
    calendarField: "createdAt",
    calendarMode: "month",
    rangeFrom: "",
    rangeTo: "",
    graph: {
      groupBy: "moduleKey",
      metric: { field: null, op: "count" },
      timeField: null,
      timeBucket: null,
      chartType: "bar",
      filters: {},
    },
  }),
});

export const adminAuditListModuleDefinition = defineRecordModule<AdminAuditListQueryState>({
  moduleId: "admin.audit.list",
  basePath: ADMIN_ROUTES.audit,
  featureFlags: createStandardFeatureFlags({
    list: true,
    timeline: true,
    calendar: true,
    graph: true,
    export: true,
  }),
  actionKey: "admin.audit.list.screen",
  favoriteKey: "admin.audit.list.favorites",
  permissions: ADMIN_AUDIT_PERMISSIONS,
  actions: {
    view: {
      key: "view",
      label: "Visualizar auditoria",
      permissionKey: "canRead",
      scope: "list",
    },
    refresh: STANDARD_LIST_ACTIONS.refresh,
  },
  queryAdapters: {
    listDataProvider: { model: "admin.audit" },
  },
  domainAdapter: {
    entity: { singular: "Registro de auditoria", plural: "Auditoria" },
    list: {
      searchPlaceholder: "Pesquisar auditoria",
      totalLabel: "Total",
      emptyStateLabel: "Nenhum registro de auditoria encontrado.",
    },
    fields: auditFieldMap,
  },
  searchConfig: adminAuditSearchView,
  views: [
    createStandardListView({
      params: {
        searchable: true,
        sortable: true,
        paginated: true,
        sortFields: ["createdAt", "entity", "action", "userName"],
      },
    }),
    {
      id: "timeline",
      title: "Timeline",
      viewType: "timeline",
      icon: <Clock3 className="size-4" />,
      params: {
        startDateField: "createdAt",
        titleField: "entity",
        dateFields: ["createdAt"],
        defaultDateField: "createdAt",
        sortDirections: ["desc", "asc"],
        defaultSortDirection: "desc",
      },
    },
    {
      id: "calendar",
      title: "Calendario",
      viewType: "calendar",
      icon: <CalendarDays className="size-4" />,
      params: {
        startDateField: "createdAt",
        titleField: "entity",
        dateFields: ["createdAt"],
        defaultDateField: "createdAt",
        modes: ["day", "week", "month", "year"],
        defaultMode: "month",
      },
    },
    {
      id: "graph",
      title: "Grafico",
      viewType: "graph",
      icon: <BarChart3 className="size-4" />,
      params: {
        builder: {
          fields: [
            { field: "action", label: "Acao", kind: "dimension" },
            { field: "entity", label: "Entidade", kind: "dimension" },
            { field: "userName", label: "Usuario", kind: "dimension", emptyValueLabel: "Sistema" },
            { field: "createdAt", label: "Data", kind: "date" },
          ],
          defaultState: {
            groupBy: "action",
            metric: { field: null, op: "count" },
            timeField: null,
            timeBucket: null,
            chartType: "bar",
            filters: {},
          },
          maxGroups: 16,
          downloadFileName: "auditoria",
        },
      },
    },
  ],
  defaultView: "list",
  defaultQueryState: createStandardListQueryState<AdminAuditListQueryState>({
    pageSize: 20,
    timelineField: "createdAt",
    timelineSortDirection: "desc",
    calendarField: "createdAt",
    calendarMode: "month",
    rangeFrom: "",
    rangeTo: "",
    graph: {
      groupBy: "action",
      metric: { field: null, op: "count" },
      timeField: null,
      timeBucket: null,
      chartType: "bar",
      filters: {},
    },
  }),
});

export const adminAuditDetailModuleDefinition = defineRecordModule<
  AdminAuditDetailQueryState,
  AdminAuditDetailLayoutContext
>({
  moduleId: "admin.audit.detail",
  basePath: ADMIN_ROUTES.auditDetail,
  featureFlags: createStandardFeatureFlags({ detail: true }),
  actionKey: "admin.audit.detail.screen",
  favoriteKey: "admin.audit.detail.favorites",
  permissions: ADMIN_AUDIT_PERMISSIONS,
  actions: {
    view: {
      key: "view",
      label: "Detalhe da auditoria",
      permissionKey: "canRead",
      scope: "detail",
    },
  },
  queryAdapters: {
    listDataProvider: { model: "admin.audit" },
    detailDataProvider: { model: "admin.audit" },
  },
  domainAdapter: {
    entity: { singular: "Registro de auditoria", plural: "Auditoria" },
    detail: {
      fallbackTitle: "Auditoria",
    },
    fields: auditFieldMap,
  },
  searchConfig: adminAuditSearchView,
  views: [createStandardDetailView()],
  defaultView: "detail",
  defaultQueryState: createStandardDetailQueryState<AdminAuditDetailQueryState>(),
  detailLayout: adminAuditDetailLayout,
});

export type AdminAnyModuleDefinition =
  | RecordModuleDefinition<AdminUsersListQueryState>
  | RecordModuleDefinition<AdminRolesListQueryState>
  | RecordModuleDefinition<AdminPermissionsListQueryState>
  | RecordModuleDefinition<AdminAuditListQueryState>
  | RecordModuleDefinition<AdminAuditDetailQueryState, AdminAuditDetailLayoutContext>
  | RecordModuleDefinition<AdminDetailQueryState, AdminOverviewLayoutContext>
  | RecordModuleDefinition<AdminDetailQueryState, AdminTenantLayoutContext>
  | RecordModuleDefinition<AdminDetailQueryState, AdminUserDetailLayoutContext>
  | RecordModuleDefinition<AdminDetailQueryState, AdminRoleDetailLayoutContext>;
