"use client";

import { ProgramsDetailEngineClientPage, ProgramsListModuleClientPage } from "@/modules/programs";
import {
  programsDetailModuleDefinition,
  programsListModuleDefinition,
  PROGRAMS_ROUTES,
} from "@/modules/programs/config/programs-module-contract";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const PROGRAMS_ACTION_IDS = {
  list: "programs.list",
  detail: "programs.detail",
  create: "programs.create",
} as const;

export const programsListAction = createModuleWindowAction({
  id: PROGRAMS_ACTION_IDS.list,
  moduleDefinition: programsListModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [{ label: "Programas", href: PROGRAMS_ROUTES.list }],
  render: () => <ProgramsListModuleClientPage />,
});

export const programsDetailAction = createModuleWindowAction({
  id: PROGRAMS_ACTION_IDS.detail,
  moduleDefinition: programsDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Programas", href: PROGRAMS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <ProgramsDetailEngineClientPage />,
});

export const programsCreateAction = createModuleWindowAction({
  id: PROGRAMS_ACTION_IDS.create,
  moduleDefinition: programsDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [{ label: "Programas", href: PROGRAMS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <ProgramsDetailEngineClientPage />,
});
