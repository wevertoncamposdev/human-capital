"use client";

import Image from "next/image";
import { SidebarHeader } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { resolveMediaUrl } from "@/lib/api";

const buildInitials = (label: string) =>
  label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TG";

export function AppSidebarHeader() {
  const { tenant } = useCurrentUser();
  const tenantName = tenant?.name ?? "Instituicao";
  const initials = buildInitials(tenantName);
  const logoSrc = tenant?.logoUrl
    ? resolveMediaUrl(tenant.logoUrl) || tenant.logoUrl
    : null;

  return (
    <SidebarHeader className="gap-3 px-4 py-5">
      <div className="flex items-center gap-3">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt={tenantName}
            width={40}
            height={40}
            unoptimized
            className="size-10 rounded-xl object-cover"
          />
        ) : (
          <div className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            {initials}
          </div>
        )}
        <div className="leading-tight">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Instituição
          </p>
          <p className="text-sm font-semibold">{tenantName}</p>
        </div>
      </div>
    </SidebarHeader>
  );
}
