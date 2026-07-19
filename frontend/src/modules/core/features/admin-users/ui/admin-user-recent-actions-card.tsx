"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/section-card";
import type { AdminAuditLog } from "@/features/admin/api";
import { AuditTimeline } from "@/modules/core/features/audit/ui/audit-timeline";
import { AuditLogDetailsDialog } from "@/modules/core/features/audit/ui/audit-log-details-dialog";

export function AdminUserRecentActionsCard({
  logs,
  loading,
  error,
  canLoadMore,
  onLoadMore,
  onRefresh,
  auditHref,
}: {
  logs: AdminAuditLog[];
  loading: boolean;
  error: string | null;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  auditHref: string;
}) {
  const [selected, setSelected] = React.useState<AdminAuditLog | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <SectionCard
      title="Últimas ações"
      subtitle="Auditoria das últimas alterações realizadas por este usuário."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            Atualizar
          </Button>
          <Button asChild variant="outline">
            <Link href={auditHref}>Ver tudo</Link>
          </Button>
        </div>
      }
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {logs.length ? (
        <AuditTimeline
          logs={logs}
          onSelect={(log) => {
            setSelected(log);
            setDialogOpen(true);
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {loading ? "Carregando..." : "Nenhuma ação encontrada."}
        </p>
      )}

      {canLoadMore ? (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loading}>
            Carregar mais
          </Button>
        </div>
      ) : null}

      <AuditLogDetailsDialog
        log={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </SectionCard>
  );
}

