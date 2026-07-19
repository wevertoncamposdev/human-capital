"use client";

import { Layers } from "lucide-react";
import type { ModuleManifest } from "@/modules/types";
import { NAV_GROUPS } from "@/modules/nav/groups";

export const programsManifest: ModuleManifest = {
  key: "programs",
  groupLabel: NAV_GROUPS.GESTAO,
  navItems: [
    {
      title: "Programas",
      href: "/programs",
      icon: Layers,
      permissions: ["programs.read"],
      order: 20,
    },
  ],
};
