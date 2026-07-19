import { buildNavGroupsFromManifests, moduleManifests } from "@/modules/registry";
import { sidebarPlaceholderManifests } from "@/components/Sidebar/sidebar-placeholders";

export const navGroups = buildNavGroupsFromManifests([
  ...moduleManifests,
  ...sidebarPlaceholderManifests,
]);
export type { NavGroup, ModuleNavItem as NavItem } from "@/modules/types";
