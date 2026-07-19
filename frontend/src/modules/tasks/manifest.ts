"use client";

import { ListTodo } from "lucide-react";
import type { ModuleManifest } from "@/modules/types";
import { NAV_GROUPS } from "@/modules/nav/groups";

export const tasksManifest: ModuleManifest = {
  key: "tasks",
  groupLabel: NAV_GROUPS.GESTAO,
  navItems: [
    {
      title: "Tarefas",
      href: "/tasks",
      icon: ListTodo,
      permissions: ["tasks.read"],
      order: 99,
    },
  ],
};
