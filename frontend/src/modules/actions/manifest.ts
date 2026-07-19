"use client";

import { ClipboardList } from "lucide-react";
import type { ModuleManifest } from "@/modules/types";
import { NAV_GROUPS } from "@/modules/nav/groups";

export const actionsManifest: ModuleManifest = {
  key: "actions",
  groupLabel: NAV_GROUPS.OPERACOES,
  navItems: [
    {
      title: "Ações",
      href: "/actions",
      icon: ClipboardList,
      permissions: ["actions.read"],
      order: 5,
    },
  ],
};
