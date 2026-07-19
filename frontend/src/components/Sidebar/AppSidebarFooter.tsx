"use client";

import { SidebarFooter } from "@/components/ui/sidebar";
import { AppSidebarUserMenu } from "@/components/Sidebar/AppSidebarUserMenu";
export function AppSidebarFooter() {
  return (
    <SidebarFooter className="px-4 py-4">
      <AppSidebarUserMenu />
    </SidebarFooter>
  );
}
