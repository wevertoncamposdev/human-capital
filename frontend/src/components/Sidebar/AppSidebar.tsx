import { AppSidebarContent } from "@/components/Sidebar/AppSidebarContent";
import { AppSidebarFooter } from "@/components/Sidebar/AppSidebarFooter";
import { AppSidebarHeader } from "@/components/Sidebar/AppSidebarHeader";
import {
  Sidebar,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <AppSidebarHeader />
      <AppSidebarContent />
      <SidebarSeparator />
      <AppSidebarFooter />
    </Sidebar>
  );
}
