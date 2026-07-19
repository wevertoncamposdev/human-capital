"use client";

import {
  Building2,
  Home,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  ScrollText,
} from "lucide-react";
import type { ModuleManifest } from "@/modules/types";
import { ADMIN_SETTINGS_PERMISSIONS } from "@/modules/core/features/settings/domain/admin-settings-access";
import { NAV_GROUPS } from "@/modules/nav/groups";

export const coreManifest: ModuleManifest = {
  key: "core",
  groupLabel: NAV_GROUPS.PAINEL,
  navItems: [
    { title: "Geral", href: "/dashboard", icon: Home, exact: true, order: 10 },
    {
      title: "Geral",
      href: "/settings",
      icon: Settings,
      groupLabel: NAV_GROUPS.ADMINISTRACAO,
      permissionsAny: [...ADMIN_SETTINGS_PERMISSIONS],
      order: 10,
    },
    {
      title: "Instituição",
      href: "/admin/tenant",
      icon: Building2,
      groupLabel: NAV_GROUPS.ADMINISTRACAO,
      permissionsAny: ["tenants.read", "tenants.update"],
      order: 20,
    },
    {
      title: "Usuários",
      href: "/admin/users",
      icon: Users,
      groupLabel: NAV_GROUPS.ADMINISTRACAO,
      permissionsAny: ["users.read"],
      order: 30,
    },
    {
      title: "Perfis",
      href: "/admin/roles",
      icon: ShieldCheck,
      groupLabel: NAV_GROUPS.ADMINISTRACAO,
      permissionsAny: ["roles.manage"],
      order: 40,
    },
    {
      title: "Permissões",
      href: "/admin/permissions",
      icon: Shield,
      groupLabel: NAV_GROUPS.ADMINISTRACAO,
      permissionsAny: ["roles.manage"],
      order: 50,
    },
    {
      title: "Auditoria",
      href: "/admin/audit-logs",
      icon: ScrollText,
      groupLabel: NAV_GROUPS.ADMINISTRACAO,
      permissionsAny: ["audit.read"],
      order: 60,
    },
    /** 
      children: [
        {
          title: "Visão geral",
          href: "/settings",
          icon: Settings,
          permissionsAny: [...ADMIN_SETTINGS_PERMISSIONS],
          order: 10,
          exact: true,
        },
      ],
    */
  ],
};
