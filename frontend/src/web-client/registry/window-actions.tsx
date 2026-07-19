import type * as React from "react";
import type { BreadcrumbItem } from "@/components/layout/BreadcrumbContext";
import {
  getModuleActionRequirement,
  getModuleCreateTitle,
  getModuleDetailTitleFallback,
  getModuleListTitle,
  getModulePermissionRequirement,
} from "@/web-client/registry/module-utils";
import type {
  ModulePermissionKey,
  PermissionRequirement,
  WindowActionModuleDefinition,
  WindowAction,
} from "@/web-client/registry/types";

export type ModuleWindowTitleVariant = "list" | "create" | "detail";

type ResolveModuleWindowActionTitleOptions = {
  moduleDefinition: WindowActionModuleDefinition;
  title?: string;
  titleVariant?: ModuleWindowTitleVariant;
  titleFallback?: string;
};

type CreateModuleWindowActionOptions = {
  id: string;
  moduleDefinition: WindowActionModuleDefinition;
  breadcrumbs: BreadcrumbItem[];
  render: () => React.ReactNode;
  title?: string;
  titleVariant?: ModuleWindowTitleVariant;
  titleFallback?: string;
  permissions?: PermissionRequirement;
  moduleActionKey?: string;
  modulePermissionKey?: ModulePermissionKey;
  defaultViewType?: WindowAction["defaultViewType"];
  views?: WindowAction["views"];
  actionSlot?: React.ReactNode;
  hideBreadcrumb?: boolean;
};

export function resolveModuleWindowActionTitle({
  moduleDefinition,
  title,
  titleVariant = "list",
  titleFallback,
}: ResolveModuleWindowActionTitleOptions) {
  if (title) return title;

  switch (titleVariant) {
    case "create":
      return getModuleCreateTitle(moduleDefinition, titleFallback ?? "Novo registro");
    case "detail":
      return getModuleDetailTitleFallback(moduleDefinition, titleFallback ?? "Detalhe");
    case "list":
    default:
      return getModuleListTitle(moduleDefinition, titleFallback ?? "Registros");
  }
}

export function resolveWindowActionPermissionRequirement(
  action: Pick<
    WindowAction,
    "permissions" | "moduleActionKey" | "modulePermissionKey" | "moduleDefinition"
  >,
) {
  if (action.permissions) return action.permissions;
  if (!action.moduleDefinition) return undefined;

  if (action.moduleActionKey) {
    return getModuleActionRequirement(
      action.moduleDefinition,
      action.moduleActionKey,
    );
  }

  if (action.modulePermissionKey) {
    return getModulePermissionRequirement(
      action.moduleDefinition.permissions,
      action.modulePermissionKey,
    );
  }

  return undefined;
}

export function createModuleWindowAction({
  id,
  moduleDefinition,
  breadcrumbs,
  render,
  title,
  titleVariant,
  titleFallback,
  permissions,
  moduleActionKey,
  modulePermissionKey,
  defaultViewType,
  views,
  actionSlot,
  hideBreadcrumb,
}: CreateModuleWindowActionOptions): WindowAction {
  return {
    id,
    title: resolveModuleWindowActionTitle({
      moduleDefinition,
      title,
      titleVariant,
      titleFallback,
    }),
    breadcrumbs,
    permissions:
      permissions ??
      resolveWindowActionPermissionRequirement({
        permissions,
        moduleDefinition,
        moduleActionKey,
        modulePermissionKey,
      }),
    moduleActionKey,
    modulePermissionKey,
    defaultViewType,
    views,
    actionSlot,
    render,
    moduleDefinition,
    hideBreadcrumb,
  };
}
