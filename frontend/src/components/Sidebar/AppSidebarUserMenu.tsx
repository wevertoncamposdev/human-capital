"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronUp, LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { resolveMediaUrl } from "@/lib/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import { canAccessAdminSettings } from "@/modules/core/features/settings/domain/admin-settings-access";

export function AppSidebarUserMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { logout, isAuthenticated } = useAuth();
  const { user, permissions } = useCurrentUser();

  const email = user?.email ?? "";
  const name = user?.name ?? email.split("@")[0] ?? "Usuário";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "US";
  const avatarUrl = user?.avatarUrl ? resolveMediaUrl(user.avatarUrl) : null;
  const canSeeSettings = canAccessAdminSettings(permissions);

  const handleLogout = () => {
    logout();
    router.replace(withTenantPath("/login", tenantSlug));
  };

  const userActions = [
    { label: "Perfil", icon: User, href: "/dashboard/profile" },
    ...(canSeeSettings
      ? [{ label: "Configurações", icon: Settings, href: "/settings" }]
      : []),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:bg-accent"
        >
          <Avatar className="size-9 rounded-lg">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <ChevronUp className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-56">
        {userActions.map((action) => (
          <DropdownMenuItem key={action.label} asChild>
            <Link href={withTenantPath(action.href, tenantSlug)}>
              <action.icon />
              <span>{action.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={handleLogout}
          disabled={!isAuthenticated}
        >
          <LogOut />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
