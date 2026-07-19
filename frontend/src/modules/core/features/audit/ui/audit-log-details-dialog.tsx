"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { AdminAuditLog } from "@/features/admin/api";
import { auditActionLabels, formatAuditEntity } from "../domain/labels";
import { formatDateTime } from "../domain/format";

export function AuditLogDetailsDialog({
  log,
  open,
  onOpenChange,
}: {
  log: AdminAuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!log) return null;

  const userLabel =
    log.user?.name || log.user?.email || log.userId || "Sistema";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,80rem)] max-w-none">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{auditActionLabels[log.action]}</Badge>
            <span className="text-sm font-semibold">{formatAuditEntity(log.entity)}</span>
            {log.entityId ? (
              <span className="text-xs text-muted-foreground">{log.entityId}</span>
            ) : null}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              {userLabel}
            </span>
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              {formatDateTime(log.createdAt)}
            </span>
            {log.requestId ? (
              <span className="rounded-full border border-border/60 px-2 py-0.5">
                Req {log.requestId}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Antes
            </p>
            <pre className="max-h-[520px] overflow-auto rounded-lg border border-border/40 bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground/80">
              {log.before ? JSON.stringify(log.before, null, 2) : "Sem dados"}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Depois
            </p>
            <pre className="max-h-[520px] overflow-auto rounded-lg border border-border/40 bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground/80">
              {log.after ? JSON.stringify(log.after, null, 2) : "Sem dados"}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
