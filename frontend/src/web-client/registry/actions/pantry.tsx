"use client";

import { PantryHistoryModuleClientPage } from "@/modules/pantry/features/history/ui/pantry-history-module-client-page";
import {
  PantryItemEditEngineClientPage,
  PantryItemNewEngineClientPage,
} from "@/modules/pantry/features/items/ui/pantry-item-detail-engine-client-page";
import { PantryStockModuleClientPage } from "@/modules/pantry/features/stock/ui/pantry-stock-module-client-page";
import {
  PantryDonorEditEngineClientPage,
  PantryDonorNewEngineClientPage,
} from "@/modules/pantry/features/donors/ui/pantry-donor-detail-engine-client-page";
import {
  PantryEntryEditEngineClientPage,
  PantryEntryNewEngineClientPage,
} from "@/modules/pantry/features/entries/ui/pantry-entry-detail-engine-client-page";
import {
  PantryExitEditEngineClientPage,
  PantryExitNewEngineClientPage,
} from "@/modules/pantry/features/exits/ui/pantry-exit-detail-engine-client-page";
import { PantryDonorsModuleClientPage } from "@/modules/pantry/features/donors/ui/pantry-donors-module-client-page";
import { PantryHeaderNav } from "@/modules/pantry/shared/ui/pantry-header-nav";
import {
  PANTRY_ACTION_IDS,
  PANTRY_ROUTES,
} from "@/modules/pantry/shared/domain/pantry.constants";
import {
  pantryDonorDetailModuleDefinition,
  pantryDonorsModuleDefinition,
  pantryEntryDetailModuleDefinition,
  pantryExitDetailModuleDefinition,
  pantryHistoryModuleDefinition,
  pantryItemDetailModuleDefinition,
  pantryStockModuleDefinition,
} from "@/modules/pantry/config/pantry-module-contract";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const pantryStockAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.stock,
  moduleDefinition: pantryStockModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Estoque", href: PANTRY_ROUTES.stock },
  ],
  actionSlot: <PantryHeaderNav />,
  render: () => <PantryStockModuleClientPage />,
});

export const pantryItemsCreateAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.itemsNew,
  moduleDefinition: pantryItemDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Estoque", href: PANTRY_ROUTES.stock },
  ],
  actionSlot: <PantryHeaderNav />,
  hideBreadcrumb: true,
  render: () => <PantryItemNewEngineClientPage />,
});

export const pantryItemsDetailAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.itemsDetail,
  moduleDefinition: pantryItemDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Estoque", href: PANTRY_ROUTES.stock },
  ],
  actionSlot: <PantryHeaderNav />,
  hideBreadcrumb: true,
  render: () => <PantryItemEditEngineClientPage />,
});

export const pantryDonorsAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.donors,
  moduleDefinition: pantryDonorsModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Doadores", href: PANTRY_ROUTES.donors },
  ],
  actionSlot: <PantryHeaderNav />,
  render: () => <PantryDonorsModuleClientPage />,
});

export const pantryDonorsCreateAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.donorsNew,
  moduleDefinition: pantryDonorDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Doadores", href: PANTRY_ROUTES.donors },
  ],
  actionSlot: <PantryHeaderNav />,
  hideBreadcrumb: true,
  render: () => <PantryDonorNewEngineClientPage />,
});

export const pantryDonorsDetailAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.donorsDetail,
  moduleDefinition: pantryDonorDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Doadores", href: PANTRY_ROUTES.donors },
  ],
  actionSlot: <PantryHeaderNav />,
  hideBreadcrumb: true,
  render: () => <PantryDonorEditEngineClientPage />,
});

export const pantryHistoryAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.history,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Histórico", href: PANTRY_ROUTES.history },
  ],
  actionSlot: <PantryHeaderNav />,
  moduleDefinition: pantryHistoryModuleDefinition,
  render: () => <PantryHistoryModuleClientPage />,
});

export const pantryEntriesCreateAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.entriesNew,
  moduleDefinition: pantryEntryDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Entradas", href: PANTRY_ROUTES.entries },
  ],
  actionSlot: <PantryHeaderNav />,
  hideBreadcrumb: true,
  render: () => <PantryEntryNewEngineClientPage />,
});

export const pantryEntriesDetailAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.entriesDetail,
  moduleDefinition: pantryEntryDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Entradas", href: PANTRY_ROUTES.entries },
  ],
  actionSlot: <PantryHeaderNav />,
  hideBreadcrumb: true,
  render: () => <PantryEntryEditEngineClientPage />,
});

export const pantryExitsCreateAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.exitsNew,
  moduleDefinition: pantryExitDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Saidas", href: PANTRY_ROUTES.exits },
  ],
  actionSlot: <PantryHeaderNav />,
  hideBreadcrumb: true,
  render: () => <PantryExitNewEngineClientPage />,
});

export const pantryExitsDetailAction = createModuleWindowAction({
  id: PANTRY_ACTION_IDS.exitsDetail,
  moduleDefinition: pantryExitDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [
    { label: "Despensa", href: PANTRY_ROUTES.root },
    { label: "Saidas", href: PANTRY_ROUTES.exits },
  ],
  actionSlot: <PantryHeaderNav />,
  hideBreadcrumb: true,
  render: () => <PantryExitEditEngineClientPage />,
});
