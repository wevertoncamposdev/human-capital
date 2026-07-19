"use client";

import { DepositHistoryModuleClientPage } from "@/modules/deposit/features/history/ui/deposit-history-module-client-page";
import {
  DepositItemEditEngineClientPage,
  DepositItemNewEngineClientPage,
} from "@/modules/deposit/features/items/ui/deposit-item-detail-engine-client-page";
import { DepositStockModuleClientPage } from "@/modules/deposit/features/stock/ui/deposit-stock-module-client-page";
import {
  DepositDonorEditEngineClientPage,
  DepositDonorNewEngineClientPage,
} from "@/modules/deposit/features/donors/ui/deposit-donor-detail-engine-client-page";
import {
  DepositEntryEditEngineClientPage,
  DepositEntryNewEngineClientPage,
} from "@/modules/deposit/features/entries/ui/deposit-entry-detail-engine-client-page";
import {
  DepositExitEditEngineClientPage,
  DepositExitNewEngineClientPage,
} from "@/modules/deposit/features/exits/ui/deposit-exit-detail-engine-client-page";
import { DepositDonorsModuleClientPage } from "@/modules/deposit/features/donors/ui/deposit-donors-module-client-page";
import { DepositHeaderNav } from "@/modules/deposit/shared/ui/deposit-header-nav";
import {
  DEPOSIT_ACTION_IDS,
  DEPOSIT_ROUTES,
} from "@/modules/deposit/shared/domain/deposit.constants";
import {
  depositDonorDetailModuleDefinition,
  depositDonorsModuleDefinition,
  depositEntryDetailModuleDefinition,
  depositExitDetailModuleDefinition,
  depositHistoryModuleDefinition,
  depositItemDetailModuleDefinition,
  depositStockModuleDefinition,
} from "@/modules/deposit/config/deposit-module-contract";
import { createModuleWindowAction } from "@/web-client/registry/window-actions";

export const depositStockAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.stock,
  moduleDefinition: depositStockModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Estoque", href: DEPOSIT_ROUTES.stock },
  ],
  actionSlot: <DepositHeaderNav />,
  render: () => <DepositStockModuleClientPage />,
});

export const depositItemsCreateAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.itemsNew,
  moduleDefinition: depositItemDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Estoque", href: DEPOSIT_ROUTES.stock },
  ],
  actionSlot: <DepositHeaderNav />,
  hideBreadcrumb: true,
  render: () => <DepositItemNewEngineClientPage />,
});

export const depositItemsDetailAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.itemsDetail,
  moduleDefinition: depositItemDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Estoque", href: DEPOSIT_ROUTES.stock },
  ],
  actionSlot: <DepositHeaderNav />,
  hideBreadcrumb: true,
  render: () => <DepositItemEditEngineClientPage />,
});

export const depositDonorsAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.donors,
  moduleDefinition: depositDonorsModuleDefinition,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Fontes", href: DEPOSIT_ROUTES.donors },
  ],
  actionSlot: <DepositHeaderNav />,
  render: () => <DepositDonorsModuleClientPage />,
});

export const depositDonorsCreateAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.donorsNew,
  moduleDefinition: depositDonorDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Fontes", href: DEPOSIT_ROUTES.donors },
  ],
  actionSlot: <DepositHeaderNav />,
  hideBreadcrumb: true,
  render: () => <DepositDonorNewEngineClientPage />,
});

export const depositDonorsDetailAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.donorsDetail,
  moduleDefinition: depositDonorDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Fontes", href: DEPOSIT_ROUTES.donors },
  ],
  actionSlot: <DepositHeaderNav />,
  hideBreadcrumb: true,
  render: () => <DepositDonorEditEngineClientPage />,
});

export const depositHistoryAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.history,
  modulePermissionKey: "canRead",
  titleVariant: "list",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Histórico", href: DEPOSIT_ROUTES.history },
  ],
  actionSlot: <DepositHeaderNav />,
  moduleDefinition: depositHistoryModuleDefinition,
  render: () => <DepositHistoryModuleClientPage />,
});

export const depositEntriesCreateAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.entriesNew,
  moduleDefinition: depositEntryDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Entradas", href: DEPOSIT_ROUTES.entries },
  ],
  actionSlot: <DepositHeaderNav />,
  hideBreadcrumb: true,
  render: () => <DepositEntryNewEngineClientPage />,
});

export const depositEntriesDetailAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.entriesDetail,
  moduleDefinition: depositEntryDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Entradas", href: DEPOSIT_ROUTES.entries },
  ],
  actionSlot: <DepositHeaderNav />,
  hideBreadcrumb: true,
  render: () => <DepositEntryEditEngineClientPage />,
});

export const depositExitsCreateAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.exitsNew,
  moduleDefinition: depositExitDetailModuleDefinition,
  moduleActionKey: "create",
  titleVariant: "create",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Saídas", href: DEPOSIT_ROUTES.exits },
  ],
  actionSlot: <DepositHeaderNav />,
  hideBreadcrumb: true,
  render: () => <DepositExitNewEngineClientPage />,
});

export const depositExitsDetailAction = createModuleWindowAction({
  id: DEPOSIT_ACTION_IDS.exitsDetail,
  moduleDefinition: depositExitDetailModuleDefinition,
  moduleActionKey: "view",
  titleVariant: "detail",
  breadcrumbs: [
    { label: "Depósito", href: DEPOSIT_ROUTES.root },
    { label: "Saídas", href: DEPOSIT_ROUTES.exits },
  ],
  actionSlot: <DepositHeaderNav />,
  hideBreadcrumb: true,
  render: () => <DepositExitEditEngineClientPage />,
});
