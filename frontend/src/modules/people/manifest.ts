import { Users } from "lucide-react";
import type { ModuleManifest } from "@/modules/types";
import { NAV_GROUPS } from "@/modules/nav/groups";

export const peopleManifest: ModuleManifest = {
  key: "people",
  groupLabel: NAV_GROUPS.GESTAO,
  navItems: [
    {
      title: "Pessoas",
      href: "/people",
      icon: Users,
      permissions: ["people.read"],
      order: 10,
    },
  ],
};
