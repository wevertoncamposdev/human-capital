"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/section-card";
import { SectionList, SectionListItem } from "@/components/section-list";
import type { AdminUser } from "@/features/admin/api";

export function AdminUserRegistrationCard({
  user,
  loading,
  error,
  onRefresh,
}: {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <SectionCard
      title="Cadastro"
      subtitle="Informações de cadastro e perfis vinculados."
      actions={
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          Atualizar
        </Button>
      }
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : null}

      {user ? (
        <SectionList>
          <SectionListItem
            title="Status"
            subtitle={user.isActive ? "Ativo" : "Inativo"}
            meta={
              <Badge variant={user.isActive ? "secondary" : "outline"}>
                {user.isActive ? "Ativo" : "Inativo"}
              </Badge>
            }
          />
          <SectionListItem
            title="Perfis"
            subtitle="Perfis vinculados ao usuário"
            meta={
              <div className="flex flex-wrap gap-1">
                {user.roles.length ? (
                  user.roles.map((role) => (
                    <Badge key={role.id} variant="outline">
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Sem perfil
                  </span>
                )}
              </div>
            }
          />
          <SectionListItem title="ID" subtitle={user.id} />
          <SectionListItem
            title="Criado em"
            subtitle={new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(user.createdAt))}
          />
          <SectionListItem
            title="Atualizado em"
            subtitle={new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(user.updatedAt))}
          />
        </SectionList>
      ) : null}
    </SectionCard>
  );
}

