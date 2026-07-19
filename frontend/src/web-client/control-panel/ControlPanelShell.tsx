"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreadcrumb } from "@/components/layout/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { useControlPanel } from "@/web-client/control-panel/ControlPanelContext";

export function ControlPanelShell() {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { breadcrumb } = useBreadcrumb();
  const { controlPanel } = useControlPanel();

  const actionSlot = breadcrumb.actionSlot;
  const primaryAction = controlPanel.primaryAction ?? breadcrumb.action;
  const primaryActionSlot = controlPanel.primaryActionSlot;

  const createButtonNode =
    primaryActionSlot ??
    (primaryAction ? (
      primaryAction.href ? (
        <Button
          size={primaryAction.size ?? "sm"}
          variant={primaryAction.variant ?? "default"}
          asChild
          className="h-8"
        >
          <Link href={withTenantPath(primaryAction.href, tenantSlug)}>
            {primaryAction.label}
          </Link>
        </Button>
      ) : (
        <Button
          size={primaryAction.size ?? "sm"}
          variant={primaryAction.variant ?? "default"}
          onClick={primaryAction.onClick}
          className="h-8"
        >
          {primaryAction.label}
        </Button>
      )
    ) : null);

  const hasContent = Boolean(
    createButtonNode ||
      actionSlot ||
      controlPanel.leftSlot ||
      controlPanel.searchSlot ||
      controlPanel.filterSlot ||
      controlPanel.groupBySlot ||
      controlPanel.favoritesSlot ||
      controlPanel.viewSwitcherSlot ||
      controlPanel.rightSlot ||
      controlPanel.viewControlsSlot,
  );

  if (!hasContent) {
    return null;
  }

  return (
    <div className="border-b border-border/60 bg-background/90 px-4 backdrop-blur">
      <div className="grid grid-cols-1 gap-3 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-4 lg:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {createButtonNode}
          {actionSlot}
          {controlPanel.leftSlot ? (
            <div className="flex flex-wrap items-center gap-2">
              {controlPanel.leftSlot}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2">
          {controlPanel.searchSlot ? (
            <div className="w-full max-w-[860px] flex-1 xl:max-w-[980px]">
              {controlPanel.searchSlot}
            </div>
          ) : null}
          {controlPanel.filterSlot}
          {controlPanel.groupBySlot}
          {controlPanel.favoritesSlot}
        </div>

        <div className="flex items-center justify-end gap-2">
          {controlPanel.viewSwitcherSlot}
          {controlPanel.rightSlot}
        </div>
      </div>
      {controlPanel.viewControlsSlot ? (
        <div className="border-t border-border/50 py-2.5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {controlPanel.viewControlsSlot}
          </div>
        </div>
      ) : null}
    </div>
  );
}
