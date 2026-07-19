"use client";

import {
  ProjectGroupsDetailEngineClientPage,
  ProjectActionsManageRouteClientPage,
  ProjectEnrollmentsManageRouteClientPage,
  ProjectGroupsListModuleClientPage,
} from "@/modules/projects";
import {
  PROJECT_GROUPS_ROUTES,
  projectGroupsDetailModuleDefinition,
  projectGroupsListModuleDefinition,
} from "@/modules/projects/config/project-groups-module-contract";
import { ProjectGroupStandaloneDetailPage } from "@/modules/projects/features/detail/ui/project-group-standalone-detail-page";
import { ProjectGroupsCreateStandalonePage } from "@/modules/projects/features/detail/ui/project-groups-create-standalone-page";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const PROJECT_STRUCTURE_ACTION_IDS = {
  groupsList: "project-groups.list",
  groupsCreate: "project-groups.create",
  groupsDetail: "project-groups.detail",
  groupsManage: "projects.groups.manage",
  enrollmentsManage: "projects.enrollments.manage",
  actionsManage: "projects.actions.manage",
} as const;

export const projectGroupsListAction = createModuleWindowAction({
  id: PROJECT_STRUCTURE_ACTION_IDS.groupsList,
  moduleDefinition: projectGroupsListModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [{ label: "Grupos", href: PROJECT_GROUPS_ROUTES.list }],
  render: () => <ProjectGroupsListModuleClientPage />,
});

export const projectGroupsCreateAction = createModuleWindowAction({
  id: PROJECT_STRUCTURE_ACTION_IDS.groupsCreate,
  moduleDefinition: projectGroupsDetailModuleDefinition,
  permissions: "project-structure.create",
  title: "Novo grupo de participantes",
  breadcrumbs: [{ label: "Grupos", href: PROJECT_GROUPS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <ProjectGroupsCreateStandalonePage />,
});

export const projectGroupsDetailAction = createModuleWindowAction({
  id: PROJECT_STRUCTURE_ACTION_IDS.groupsDetail,
  moduleDefinition: projectGroupsDetailModuleDefinition,
  permissions: "project-structure.read",
  title: "Grupo de Participantes",
  breadcrumbs: [{ label: "Grupos", href: PROJECT_GROUPS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <ProjectGroupStandaloneDetailPage />,
});

export const projectGroupsManageAction = createModuleWindowAction({
  id: PROJECT_STRUCTURE_ACTION_IDS.groupsManage,
  moduleDefinition: projectGroupsDetailModuleDefinition,
  permissions: "project-structure.read",
  title: "Grupos do projeto",
  breadcrumbs: [{ label: "Projetos", href: "/projects" }],
  hideBreadcrumb: true,
  render: () => <ProjectGroupsDetailEngineClientPage />,
});

export const projectEnrollmentsManageAction = createModuleWindowAction({
  id: PROJECT_STRUCTURE_ACTION_IDS.enrollmentsManage,
  moduleDefinition: projectGroupsListModuleDefinition,
  permissions: { allOf: ["projects.read", "enrollments.read"] },
  title: "Matriculas do projeto",
  breadcrumbs: [{ label: "Projetos", href: "/projects" }],
  hideBreadcrumb: true,
  render: () => <ProjectEnrollmentsManageRouteClientPage />,
});

export const projectActionsManageAction = createModuleWindowAction({
  id: PROJECT_STRUCTURE_ACTION_IDS.actionsManage,
  moduleDefinition: projectGroupsListModuleDefinition,
  permissions: { allOf: ["projects.read", "actions.read"] },
  title: "Acoes do projeto",
  breadcrumbs: [{ label: "Projetos", href: "/projects" }],
  hideBreadcrumb: true,
  render: () => <ProjectActionsManageRouteClientPage />,
});
