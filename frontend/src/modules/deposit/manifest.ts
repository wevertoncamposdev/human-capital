"use client";

import { Package } from "lucide-react";
import type { ModuleManifest } from "@/modules/types";
import { NAV_GROUPS } from "@/modules/nav/groups";

export const depositManifest: ModuleManifest = {
  key: "deposit",
  groupLabel: NAV_GROUPS.RECURSOS,
  navItems: [
    {
      title: "Depósito",
      href: "/deposit",
      icon: Package,
      permissions: ["deposit.read"],
      order: 10,
    },
  ],
};
