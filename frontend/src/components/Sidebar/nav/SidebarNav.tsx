"use client";

import * as React from "react";
import { SidebarContent, SidebarMenu } from "@/components/ui/sidebar";
import { navGroups } from "@/components/Sidebar/sidebar-data";
import { SidebarNavGroup } from "./SidebarNavGroup";
import { canAccessNavItem } from "./sidebar-nav-utils";

export function SidebarNav(props: {
  pathname: string;
  tenantSlug: string | null;
  permissions: string[];
  roles: string[];
}) {
  const [openByHref, setOpenByHref] = React.useState<Record<string, boolean>>(
    {},
  );

  React.useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const content = document.querySelector('[data-sidebar="content"]');
      if (!content) return;

      const activeSubButtons = content.querySelectorAll(
        '[data-sidebar="menu-sub-button"][data-active="true"]',
      );
      const target =
        activeSubButtons.length > 0
          ? activeSubButtons.item(activeSubButtons.length - 1)
          : content.querySelector(
              '[data-sidebar="menu-button"][data-active="true"]',
            );

      if (!target) return;
      if (!(target instanceof HTMLElement)) return;
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [props.pathname]);

  return (
    <SidebarContent className="pb-4">
      <SidebarMenu>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            canAccessNavItem(props.permissions, props.roles, item),
          );
          if (visibleItems.length === 0) return null;
          return (
            <SidebarNavGroup
              key={group.label}
              group={{ ...group, items: visibleItems }}
              pathname={props.pathname}
              tenantSlug={props.tenantSlug}
              permissions={props.permissions}
              roles={props.roles}
              openByHref={openByHref}
              setOpenByHref={setOpenByHref}
            />
          );
        })}
      </SidebarMenu>
    </SidebarContent>
  );
}
