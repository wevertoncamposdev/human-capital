"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, History, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { PANTRY_ROUTES } from "@/modules/pantry/shared/domain/pantry.constants";

type PantryHeaderNavProps = {
  className?: string;
};

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
};

export function PantryHeaderNav({ className }: PantryHeaderNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const stockHref = withTenantPath(PANTRY_ROUTES.stock, tenantSlug);
  const donorsHref = withTenantPath(PANTRY_ROUTES.donors, tenantSlug);
  const historyHref = withTenantPath(PANTRY_ROUTES.history, tenantSlug);

  const isHistory = pathname.startsWith(historyHref);
  const isDonors = pathname.startsWith(donorsHref);
  const isStock = !isHistory && !isDonors;

  const items = React.useMemo<NavItem[]>(
    () => [
      {
        id: "stock",
        label: "Estoque",
        href: stockHref,
        active: isStock,
        icon: Package,
      },
      {
        id: "donors",
        label: "Doadores",
        href: donorsHref,
        active: isDonors,
        icon: Users,
      },
      {
        id: "history",
        label: "Histórico",
        href: historyHref,
        active: isHistory,
        icon: History,
      },
    ],
    [donorsHref, historyHref, isDonors, isHistory, isStock, stockHref],
  );

  const activeItem = React.useMemo(() => {
    return items.find((item) => item.active) ?? items[0];
  }, [items]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 gap-2 px-2.5 text-xs", className)}
          aria-label="Menu da despensa"
          title="Menu da despensa"
        >
          <activeItem.icon className="size-4" />
          <span className="hidden sm:inline">{activeItem.label}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => router.push(item.href)}
              className="gap-2 text-xs"
            >
              <Icon className="size-4 text-muted-foreground" />
              <span>{item.label}</span>
              {item.active ? <Check className="ml-auto size-4 opacity-70" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
