"use client";

import {
  PeopleSegmentsDetailEngineClientPage,
  PeopleSegmentsListModuleClientPage,
} from "@/modules/people-segments";
import {
  peopleSegmentsDetailModuleDefinition,
  peopleSegmentsListModuleDefinition,
  PEOPLE_SEGMENTS_ROUTES,
} from "@/modules/people-segments/config/people-segments-module-contract";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const PEOPLE_SEGMENTS_ACTION_IDS = {
  list: "people-segments.list",
  detail: "people-segments.detail",
  create: "people-segments.create",
} as const;

export const peopleSegmentsListAction = createModuleWindowAction({
  id: PEOPLE_SEGMENTS_ACTION_IDS.list,
  moduleDefinition: peopleSegmentsListModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [{ label: "Grupos de Pessoas", href: PEOPLE_SEGMENTS_ROUTES.list }],
  render: () => <PeopleSegmentsListModuleClientPage />,
});

export const peopleSegmentsDetailAction = createModuleWindowAction({
  id: PEOPLE_SEGMENTS_ACTION_IDS.detail,
  moduleDefinition: peopleSegmentsDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [{ label: "Grupos de Pessoas", href: PEOPLE_SEGMENTS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <PeopleSegmentsDetailEngineClientPage />,
});

export const peopleSegmentsCreateAction = createModuleWindowAction({
  id: PEOPLE_SEGMENTS_ACTION_IDS.create,
  moduleDefinition: peopleSegmentsDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [{ label: "Grupos de Pessoas", href: PEOPLE_SEGMENTS_ROUTES.list }],
  hideBreadcrumb: true,
  render: () => <PeopleSegmentsDetailEngineClientPage />,
});
