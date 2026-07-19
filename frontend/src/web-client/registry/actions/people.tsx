"use client";

import { PeopleCreatePage } from "@/modules/people/features/create/ui/people-create-page";
import { PeopleDetailEngineClientPage } from "@/modules/people/features/detail/ui/people-detail-engine-client-page";
import { PeopleListModuleClientPage } from "@/modules/people/features/list/ui/people-list-module-client-page";
import {
  peopleDetailModuleDefinition,
  peopleListModuleDefinition,
  PEOPLE_ROUTES,
} from "@/modules/people/config/people-module-contract";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const PEOPLE_ACTION_IDS = {
  list: "people.list",
  detail: "people.detail",
  create: "people.create",
} as const;

export const peopleListAction = createModuleWindowAction({
  id: PEOPLE_ACTION_IDS.list,
  moduleDefinition: peopleListModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [{ label: "Pessoas", href: PEOPLE_ROUTES.list }],
  render: () => <PeopleListModuleClientPage />,
});

export const peopleDetailAction = createModuleWindowAction({
  id: PEOPLE_ACTION_IDS.detail,
  moduleDefinition: peopleDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Pessoas", href: PEOPLE_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <PeopleDetailEngineClientPage />,
});

export const peopleCreateAction = createModuleWindowAction({
  id: PEOPLE_ACTION_IDS.create,
  moduleDefinition: peopleDetailModuleDefinition,
  modulePermissionKey: "canCreate",
  titleVariant: "create",
  breadcrumbs: [{ label: "Pessoas", href: PEOPLE_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <PeopleCreatePage />,
});
