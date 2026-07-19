"use client";

import {
  ActionCreateEngineClientPage,
  ActionDetailEngineClientPage,
  ActionsListModuleClientPage,
} from "@/modules/actions";
import {
  ACTIONS_ROUTES,
  actionsDetailModuleDefinition,
  actionsListModuleDefinition,
} from "@/modules/actions/config/actions-module-contract";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const ACTIONS_ACTION_IDS = {
  list: "actions.list",
  detail: "actions.detail",
  create: "actions.create",
} as const;

export const actionsListAction = createModuleWindowAction({
  id: ACTIONS_ACTION_IDS.list,
  moduleDefinition: actionsListModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [{ label: "Ações", href: ACTIONS_ROUTES.list }],
  render: () => <ActionsListModuleClientPage />,
});

export const actionsDetailAction = createModuleWindowAction({
  id: ACTIONS_ACTION_IDS.detail,
  moduleDefinition: actionsDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Ações", href: ACTIONS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <ActionDetailEngineClientPage />,
});

export const actionsCreateAction = createModuleWindowAction({
  id: ACTIONS_ACTION_IDS.create,
  moduleDefinition: actionsDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [{ label: "Ações", href: ACTIONS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <ActionCreateEngineClientPage />,
});
