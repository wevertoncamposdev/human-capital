"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  KeyRound,
  ScrollText,
  Shield,
  Users,
  ChevronDown,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { resolveMediaUrl } from "@/lib/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  title: string;
  href: string;
  permission?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  {
    title: "Visão geral",
    href: "/settings",
    icon: Building2,
  },
  {
    title: "Instituição",
    href: "/admin/tenant",
    permission: "tenants.read",
    icon: Building2,
  },
  {
    title: "Usuários",
    href: "/admin/users",
    permission: "users.read",
    icon: Users,
  },
  {
    title: "Perfis",
    href: "/admin/roles",
    permission: "roles.manage",
    icon: Shield,
  },
  {
    title: "Permissões",
    href: "/admin/permissions",
    permission: "roles.manage",
    icon: KeyRound,
  },
  {
    title: "Auditoria",
    href: "/admin/audit-logs",
    permission: "audit.read",
    icon: ScrollText,
  },
];

function isActivePath(pathname: string, itemHref: string) {
  if (pathname === itemHref) return true;
  return pathname.startsWith(`${itemHref}/`);
}

export function AdminSettingsHeader({ title }: { title?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { tenant, permissions } = useCurrentUser();

  const visibleItems = React.useMemo(
    () =>
      NAV_ITEMS.filter((item) =>
        item.permission ? permissions.includes(item.permission) : true,
      ),
    [permissions],
  );

  const tenantLogo = tenant?.logoUrl ? resolveMediaUrl(tenant.logoUrl) : null;
  const tenantName = tenant?.name ?? "Instituição";
  const currentItem = React.useMemo(() => {
    const match = visibleItems.find((item) =>
      isActivePath(pathname, withTenantPath(item.href, tenantSlug)),
    );
    return match ?? visibleItems[0] ?? null;
  }, [pathname, tenantSlug, visibleItems]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid size-14 place-items-center overflow-hidden rounded-2xl border border-border bg-background">
            {tenantLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenantLogo}
                alt={tenantName}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {title ?? "Configurações"}
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-foreground">
              {tenantName}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Administração da instituição
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Administração
            </p>
            <p className="text-xs text-muted-foreground">
              Selecione uma área para configurar.
            </p>
          </div>

          {visibleItems.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between gap-2">
                  <span className="inline-flex items-center gap-2">
                    {currentItem ? (
                      <currentItem.icon className="size-4" />
                    ) : null}
                    <span>{currentItem?.title ?? "Selecione"}</span>
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                  Configurações
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleItems.map((item) => {
                  const resolvedHref = withTenantPath(item.href, tenantSlug);
                  const active = isActivePath(pathname, resolvedHref);
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      onClick={() => router.push(resolvedHref)}
                      className={cn(active ? "bg-muted/40" : "")}
                    >
                      <Icon className="size-4" />
                      <span>{item.title}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você não tem permissões administrativas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
