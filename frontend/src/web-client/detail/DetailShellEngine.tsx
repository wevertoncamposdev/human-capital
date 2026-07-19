"use client";

import * as React from "react";
import type { BreadcrumbItem } from "@/components/layout/BreadcrumbContext";
import {
  DetailShell,
  type DetailShellLabels,
  type DetailShellMode,
} from "@/components/layout/DetailShell";
import type { DataProvider } from "@/web-client/data-provider/types";
import type { DetailAuditFeedState } from "@/web-client/detail/audit-types";
import {
  DetailRelationsRenderer,
  DetailTabsRenderer,
} from "@/web-client/detail/DetailLayoutSections";
import { useDetailAuditFeed } from "@/web-client/detail/useDetailAuditFeed";
import {
  getModuleDetailShellText,
  getModuleDetailTitleFallback,
} from "@/web-client/registry/module-utils";
import type { RecordModuleDefinition, RecordQueryState } from "@/web-client/registry/types";

export type DetailShellAuditContext = {
  detailAudit?: DetailAuditFeedState;
};

type DetailShellEngineProps<TContext extends Record<string, unknown>> = {
  moduleDefinition: RecordModuleDefinition<RecordQueryState, TContext>;
  context: TContext;
  dataProvider?: DataProvider;
  auditEnabled?: boolean;
  mode: DetailShellMode;
  headerTitle: string;
  saving: boolean;
  loading?: boolean;
  readOnly: boolean;
  onSave?: () => void;
  onClose: () => void;
  breadcrumbTitle: string;
  breadcrumbItems: BreadcrumbItem[];
  actionSlot?: React.ReactNode;
  headerActionsSlot?: React.ReactNode;
  labels?: DetailShellLabels;
  fallbackMainSlot?: React.ReactNode;
  fallbackSideSlot?: React.ReactNode;
  fallbackBottomSlot?: React.ReactNode;
  fallbackViewControlsSlot?: React.ReactNode;
};

export function DetailShellEngine<TContext extends Record<string, unknown>>({
  moduleDefinition,
  context,
  dataProvider,
  auditEnabled = true,
  mode,
  headerTitle,
  saving,
  loading,
  readOnly,
  onSave,
  onClose,
  breadcrumbTitle,
  breadcrumbItems,
  actionSlot,
  headerActionsSlot,
  labels,
  fallbackMainSlot = null,
  fallbackSideSlot = null,
  fallbackBottomSlot = null,
  fallbackViewControlsSlot = null,
}: DetailShellEngineProps<TContext>) {
  const layout = React.useMemo(
    () => moduleDefinition.detailLayout,
    [moduleDefinition.detailLayout],
  );
  const detailAudit = useDetailAuditFeed({
    dataProvider,
    auditAdapter: moduleDefinition.queryAdapters.auditDataProvider,
    auditConfig: layout?.auditSources,
    context,
    enabled: auditEnabled && mode === "edit",
  });
  const engineContext = React.useMemo(
    () =>
      ({
        ...context,
        detailAudit,
      }) as TContext & DetailShellAuditContext,
    [context, detailAudit],
  );

  const headerSlot = React.useMemo(
    () =>
      layout?.header?.slot?.(engineContext) ??
      layout?.headerSlot?.(engineContext) ??
      null,
    [engineContext, layout],
  );
  const headerTitleSlot = React.useMemo(
    () => layout?.header?.leadingSlot?.(engineContext) ?? null,
    [engineContext, layout],
  );

  const titleFromLayout = layout?.header?.title?.(engineContext);

  const mainSlot = React.useMemo(
    () =>
      layout?.main?.(engineContext) ??
      layout?.mainSlot?.(engineContext) ??
      fallbackMainSlot,
    [engineContext, fallbackMainSlot, layout],
  );

  const tabsSlot = React.useMemo(
    () =>
      layout?.tabs?.(engineContext) ??
      (layout?.tabTemplates?.length ? (
        <DetailTabsRenderer
          tabs={layout.tabTemplates}
          context={engineContext}
        />
      ) : null),
    [engineContext, layout],
  );

  const sideSlot = React.useMemo(
    () =>
      layout?.side?.(engineContext) ??
      layout?.sideSlot?.(engineContext) ??
      fallbackSideSlot,
    [engineContext, fallbackSideSlot, layout],
  );

  const bottomSlot = React.useMemo(
    () =>
      layout?.bottom?.(engineContext) ??
      (layout?.bottomRelations?.length ? (
        <DetailRelationsRenderer
          relations={layout.bottomRelations}
          context={engineContext}
        />
      ) : fallbackBottomSlot),
    [engineContext, fallbackBottomSlot, layout],
  );

  const viewControlsSlot = React.useMemo(
    () => layout?.viewControls?.(engineContext) ?? fallbackViewControlsSlot,
    [engineContext, fallbackViewControlsSlot, layout],
  );

  const resolvedHeaderTitle = titleFromLayout ?? headerTitle;
  const resolvedLabels = React.useMemo(
    () => ({
      ...(getModuleDetailShellText(moduleDefinition) ?? {}),
      ...(labels ?? {}),
    }),
    [labels, moduleDefinition],
  );
  const finalHeaderTitle = React.useMemo(
    () =>
      resolvedHeaderTitle || getModuleDetailTitleFallback(moduleDefinition),
    [moduleDefinition, resolvedHeaderTitle],
  );

  const composedMainSlot = React.useMemo(
    () => (
      <>
        {mainSlot}
        {tabsSlot ? <div className="mt-4">{tabsSlot}</div> : null}
      </>
    ),
    [mainSlot, tabsSlot],
  );

  return (
    <DetailShell
      breadcrumbTitle={breadcrumbTitle}
      breadcrumbItems={breadcrumbItems}
      actionSlot={actionSlot}
      mode={mode}
      headerTitle={finalHeaderTitle}
      saving={saving}
      loading={loading}
      readOnly={readOnly}
      onSave={onSave}
      onClose={onClose}
      headerActionsSlot={headerActionsSlot}
      headerTitleSlot={headerTitleSlot}
      headerInfoSlot={headerSlot}
      viewControlsSlot={viewControlsSlot}
      mainSlot={composedMainSlot}
      sideSlot={sideSlot}
      bottomSlot={bottomSlot}
      labels={resolvedLabels}
    />
  );
}

export function DetailShellLayout<TContext extends Record<string, unknown>>(
  props: DetailShellEngineProps<TContext>,
): React.ReactElement {
  return <DetailShellEngine {...props} />;
}
