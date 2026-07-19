"use client";

import { ProjectsDetailEngineClientPage, ProjectsListModuleClientPage } from "@/modules/projects";
import {
  projectsDetailModuleDefinition,
  projectsListModuleDefinition,
  PROJECTS_ROUTES,
} from "@/modules/projects/config/projects-module-contract";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const PROJECTS_ACTION_IDS = {
  list: "projects.list",
  detail: "projects.detail",
  create: "projects.create",
} as const;

export const projectsListAction = createModuleWindowAction({
  id: PROJECTS_ACTION_IDS.list,
  moduleDefinition: projectsListModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [{ label: "Projetos", href: PROJECTS_ROUTES.list }],
  render: () => <ProjectsListModuleClientPage />,
});

export const projectsDetailAction = createModuleWindowAction({
  id: PROJECTS_ACTION_IDS.detail,
  moduleDefinition: projectsDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Projetos", href: PROJECTS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <ProjectsDetailEngineClientPage />,
});

export const projectsCreateAction = createModuleWindowAction({
  id: PROJECTS_ACTION_IDS.create,
  moduleDefinition: projectsDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [{ label: "Projetos", href: PROJECTS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <ProjectsDetailEngineClientPage />,
});
