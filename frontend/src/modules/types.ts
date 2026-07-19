import type { LucideIcon } from "lucide-react";

export type ModuleNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  exact?: boolean;
  disabled?: boolean;
  roles?: string[];
  rolesAny?: string[];
  permissions?: string[];
  permissionsAny?: string[];
  groupLabel?: string;
  order?: number;
  children?: ModuleNavItem[];
};

export type ModuleManifest = {
  key: string;
  groupLabel: string;
  navItems: ModuleNavItem[];
};

export type NavGroup = {
  label: string;
  items: ModuleNavItem[];
};
