"use client";

import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath } from "@/lib/tenant-path";
import { SidebarNav } from "@/components/Sidebar/nav/SidebarNav";

export function AppSidebarContent() {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { permissions, roles } = useCurrentUser();

  return (
    <SidebarNav
      pathname={pathname}
      tenantSlug={tenantSlug}
      permissions={permissions}
      roles={roles}
    />
  );
}
