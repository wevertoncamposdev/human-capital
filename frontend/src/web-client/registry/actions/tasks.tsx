"use client";

import { TasksCreatePage } from "@/modules/tasks/features/create/ui/tasks-create-page";
import { TasksDetailEngineClientPage } from "@/modules/tasks/features/detail/ui/tasks-detail-engine-client-page";
import { TasksListModuleClientPage } from "@/modules/tasks/features/list/ui/tasks-list-module-client-page";
import {
  tasksDetailModuleDefinition,
  tasksListModuleDefinition,
  TASKS_ROUTES,
} from "@/modules/tasks/config/tasks-module-contract";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const TASKS_ACTION_IDS = {
  list: "tasks.list",
  detail: "tasks.detail",
  create: "tasks.create",
} as const;

export const tasksListAction = createModuleWindowAction({
  id: TASKS_ACTION_IDS.list,
  moduleDefinition: tasksListModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [{ label: "Tarefas", href: TASKS_ROUTES.list }],
  render: () => <TasksListModuleClientPage />,
});

export const tasksDetailAction = createModuleWindowAction({
  id: TASKS_ACTION_IDS.detail,
  moduleDefinition: tasksDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Tarefas", href: TASKS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <TasksDetailEngineClientPage />,
});

export const tasksCreateAction = createModuleWindowAction({
  id: TASKS_ACTION_IDS.create,
  moduleDefinition: tasksDetailModuleDefinition,
  modulePermissionKey: "canCreate",
  titleVariant: "create",
  breadcrumbs: [{ label: "Tarefas", href: TASKS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <TasksCreatePage />,
});
