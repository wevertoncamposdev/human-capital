"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useBreadcrumb } from "@/components/layout/BreadcrumbContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";

export function AppHeader() {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { breadcrumb } = useBreadcrumb();

  const breadcrumbItems = React.useMemo(() => {
    const items = breadcrumb.items.map((item) => ({ ...item }));

    if (!items.length && breadcrumb.title) {
      return [{ label: breadcrumb.title }];
    }

    const lastLabel = items.length ? items[items.length - 1]?.label : undefined;
    if (breadcrumb.title && lastLabel !== breadcrumb.title) {
      return [...items, { label: breadcrumb.title }];
    }

    return items;
  }, [breadcrumb.items, breadcrumb.title]);

  const forceInstallButton =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_PWA_FORCE_INSTALL === "1";

  return (
    <header className="flex min-w-0 items-center gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur">
      <SidebarTrigger />

      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {breadcrumbItems.length ? (
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden text-xs">
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;
                  const isModuleTitle = index === 0;
                  const emphasizeClassName = isModuleTitle
                    ? "font-semibold text-foreground"
                    : undefined;
                  const pageClassName = emphasizeClassName
                    ? `truncate text-xs ${emphasizeClassName}`
                    : "truncate text-xs";

                  return (
                    <React.Fragment key={`${item.label}-${index}`}>
                      <BreadcrumbItem>
                        {isLast || !item.href ? (
                          <BreadcrumbPage className={pageClassName}>
                            {item.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild className={emphasizeClassName}>
                            <Link href={withTenantPath(item.href, tenantSlug)}>
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {isLast ? null : <BreadcrumbSeparator />}
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2">
          <PWAInstallButton
            forceDisplay={forceInstallButton}
            className={forceInstallButton ? "animate-pulse" : undefined}
          />
        </div>
      </div>
    </header>
  );
}
