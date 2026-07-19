"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { NavGroup } from "@/modules/types";
import type { ModuleNavItem } from "@/modules/types";
import { withTenantPath } from "@/lib/tenant-path";
import {
  DEFAULT_NAV_GROUP_ICON,
  NAV_GROUP_ICON_BY_LABEL,
} from "./sidebar-group-icons";
import { canAccessNavItem, isActiveHref, isActiveNavItem } from "./sidebar-nav-utils";

function SidebarSubBadgePill({ children }: { children: string }) {
  return (
    <span className="ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-accent-foreground">
      {children}
    </span>
  );
}

function GroupItem(props: {
  item: ModuleNavItem;
  pathname: string;
  tenantSlug: string | null;
  permissions: string[];
  roles: string[];
  openByHref: Record<string, boolean>;
  setOpenByHref: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const closeSidebarOnNavigate = React.useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  const visibleChildren = props.item.children?.filter((child) =>
    canAccessNavItem(props.permissions, props.roles, child),
  );

  const active = isActiveNavItem({
    pathname: props.pathname,
    tenantSlug: props.tenantSlug,
    item: props.item,
    visibleChildren,
  });

  const expanded =
    visibleChildren && visibleChildren.length > 0
      ? active
        ? true
        : (props.openByHref[props.item.href] ?? false)
      : false;

  const disabled = !!props.item.disabled;

  return (
    <SidebarMenuSubItem key={props.item.href} className="relative">
      {disabled ? (
        <SidebarMenuSubButton isActive={false} aria-disabled tabIndex={-1}>
          <props.item.icon />
          <span>{props.item.title}</span>
          {props.item.badge ? <SidebarSubBadgePill>{props.item.badge}</SidebarSubBadgePill> : null}
        </SidebarMenuSubButton>
      ) : (
        <SidebarMenuSubButton asChild isActive={active} onClick={closeSidebarOnNavigate}>
          <Link href={withTenantPath(props.item.href, props.tenantSlug)}>
            <props.item.icon />
            <span>{props.item.title}</span>
            {props.item.badge ? <SidebarSubBadgePill>{props.item.badge}</SidebarSubBadgePill> : null}
          </Link>
        </SidebarMenuSubButton>
      )}

      {!disabled && visibleChildren?.length ? (
        <button
          type="button"
          disabled={active}
          aria-disabled={active}
          aria-label={expanded ? "Recolher" : "Expandir"}
          title={expanded ? "Recolher" : "Expandir"}
          className="text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-60 [&>svg]:size-4 [&>svg]:shrink-0"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (active) return;
            props.setOpenByHref((prev) => ({
              ...prev,
              [props.item.href]: !(prev[props.item.href] ?? active),
            }));
          }}
        >
          <ChevronDown
            className={
              "size-4 transition-transform " + (expanded ? "rotate-0" : "-rotate-90")
            }
          />
        </button>
      ) : null}

      {!disabled && visibleChildren?.length && expanded ? (
        <SidebarMenuSub>
          {visibleChildren.map((child) => {
            const childDisabled = !!child.disabled;
            const childActive = childDisabled
              ? false
              : isActiveHref({
                  pathname: props.pathname,
                  tenantSlug: props.tenantSlug,
                  itemHref: child.href,
                  exact: child.exact,
                });

            return (
              <SidebarMenuSubItem key={`${props.item.href}:${child.href}`}>
                {childDisabled ? (
                  <SidebarMenuSubButton isActive={false} aria-disabled tabIndex={-1}>
                    <child.icon />
                    <span>{child.title}</span>
                    {child.badge ? <SidebarSubBadgePill>{child.badge}</SidebarSubBadgePill> : null}
                  </SidebarMenuSubButton>
                ) : (
                  <SidebarMenuSubButton
                    asChild
                    isActive={childActive}
                    onClick={closeSidebarOnNavigate}
                  >
                    <Link href={withTenantPath(child.href, props.tenantSlug)}>
                      <child.icon />
                      <span>{child.title}</span>
                      {child.badge ? <SidebarSubBadgePill>{child.badge}</SidebarSubBadgePill> : null}
                    </Link>
                  </SidebarMenuSubButton>
                )}
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuSubItem>
  );
}

export function SidebarNavGroup(props: {
  group: NavGroup;
  pathname: string;
  tenantSlug: string | null;
  permissions: string[];
  roles: string[];
  openByHref: Record<string, boolean>;
  setOpenByHref: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const groupKey = `__group__:${props.group.label}`;
  const GroupIcon =
    NAV_GROUP_ICON_BY_LABEL[props.group.label] ?? DEFAULT_NAV_GROUP_ICON;

  const groupHasActiveItem = props.group.items.some((item) => {
    const visibleChildren = item.children?.filter((child) =>
      canAccessNavItem(props.permissions, props.roles, child),
    );
    return isActiveNavItem({
      pathname: props.pathname,
      tenantSlug: props.tenantSlug,
      item,
      visibleChildren,
    });
  });

  const groupExpanded = groupHasActiveItem
    ? true
    : (props.openByHref[groupKey] ?? false);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        isActive={groupHasActiveItem}
        tooltip={props.group.label}
        onClick={(event) => {
          event.preventDefault();
          if (groupHasActiveItem) return;
          props.setOpenByHref((prev) => ({
            ...prev,
            [groupKey]: !(prev[groupKey] ?? false),
          }));
        }}
      >
        <GroupIcon />
        <span>{props.group.label}</span>
      </SidebarMenuButton>

      <SidebarMenuAction
        type="button"
        aria-label={groupExpanded ? "Recolher" : "Expandir"}
        title={groupExpanded ? "Recolher" : "Expandir"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (groupHasActiveItem) return;
          props.setOpenByHref((prev) => ({
            ...prev,
            [groupKey]: !(prev[groupKey] ?? false),
          }));
        }}
      >
        <ChevronDown
          className={
            "size-4 transition-transform " +
            (groupExpanded ? "rotate-0" : "-rotate-90")
          }
        />
      </SidebarMenuAction>

      {groupExpanded ? (
        <SidebarMenuSub>
          {props.group.items.map((item) => (
            <GroupItem
              key={item.href}
              item={item}
              pathname={props.pathname}
              tenantSlug={props.tenantSlug}
              permissions={props.permissions}
              roles={props.roles}
              openByHref={props.openByHref}
              setOpenByHref={props.setOpenByHref}
            />
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}
