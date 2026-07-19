"use client";

import { FolderKanban, FolderTree } from "lucide-react";
import type { ModuleManifest } from "@/modules/types";
import { NAV_GROUPS } from "@/modules/nav/groups";

export const projectsManifest: ModuleManifest = {
  key: "projects",
  groupLabel: NAV_GROUPS.GESTAO,
  navItems: [
    {
      title: "Projetos",
      href: "/projects",
      icon: FolderKanban,
      permissions: ["projects.read"],
      order: 30,
    },
    {
      title: "Grupos",
      href: "/projects/groups",
      icon: FolderTree,
      permissions: ["project-structure.read"],
      order: 31,
    },
  ],
};
