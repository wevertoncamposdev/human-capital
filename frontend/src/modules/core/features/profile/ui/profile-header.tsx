"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChevronDown, KeyRound, Shield, User } from "lucide-react";

export type ProfileTabKey = "profile" | "security" | "logs";

const TAB_ITEMS: Array<{
  value: ProfileTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    value: "profile",
    label: "Perfil",
    icon: User,
    description: "Dados pessoais, foto e informações básicas.",
  },
  {
    value: "security",
    label: "Segurança",
    icon: Shield,
    description: "Configurações de 2FA e proteção da conta.",
  },
  {
    value: "logs",
    label: "Acessos",
    icon: KeyRound,
    description: "Histórico de login, refresh e logout.",
  },
];

export function ProfileHeader({
  tab,
  onTabChange,
  user,
}: {
  tab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  user: { name?: string | null; email: string; avatarUrl?: string | null } | null;
}) {
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

  const current =
    TAB_ITEMS.find((item) => item.value === tab) ?? TAB_ITEMS[0];
  const CurrentIcon = current.icon;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <Avatar className="size-14">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Perfil
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-foreground">
              {name}
            </p>
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {email}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Área</p>
            <p className="text-xs text-muted-foreground">{current.description}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <CurrentIcon className="size-4" />
                  <span>{current.label}</span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                Navegação
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={tab}
                onValueChange={(value) => onTabChange(value as ProfileTabKey)}
              >
                {TAB_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuRadioItem
                      key={item.value}
                      value={item.value}
                      className={cn("flex items-center gap-2")}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

