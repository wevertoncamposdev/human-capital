"use client";

import {
  Package,
} from "lucide-react";
import type { ModuleManifest } from "@/modules/types";
import { NAV_GROUPS } from "@/modules/nav/groups";

export const pantryManifest: ModuleManifest = {
  key: "pantry",
  groupLabel: NAV_GROUPS.RECURSOS,
  navItems: [
    {
      title: "Despensa",
      href: "/pantry",
      icon: Package,
      permissions: ["pantry.read"],
      order: 10,
      /** 
      children: [
        {
          title: "Itens",
          href: "/pantry/items",
          icon: PackageSearch,
          permissions: ["pantry.read"],
          order: 10,
        },
        {
          title: "Entradas",
          href: "/pantry/entries",
          icon: PackagePlus,
          permissions: ["pantry.read"],
          order: 20,
        },
        {
          title: "Saídas",
          href: "/pantry/exits",
          icon: Truck,
          permissions: ["pantry.read"],
          order: 30,
        },
        {
          title: "Doadores",
          href: "/pantry/donors",
          icon: Users,
          permissions: ["pantry.read"],
          order: 40,
        },
      ],*/
    },
  ],
};

