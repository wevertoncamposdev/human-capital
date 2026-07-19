"use client";

import * as React from "react";
import type { AdminAuditLog } from "@/features/admin/api";
import { Badge } from "@/components/ui/badge";
import { auditActionLabels, formatAuditEntity } from "../domain/labels";
import { formatTime } from "../domain/format";

export function AuditTimeline({
  logs,
  onSelect,
}: {
  logs: AdminAuditLog[];
  onSelect: (log: AdminAuditLog) => void;
}) {
  return (
    <div className="relative pl-5">
      <div className="absolute left-2 top-0 h-full w-px bg-border/70" />
      <div className="space-y-3">
        {logs.map((log) => {
          const userLabel =
            log.user?.name || log.user?.email || log.userId || "Sistema";
          return (
            <button
              key={log.id}
              type="button"
              onClick={() => onSelect(log)}
              className="group relative w-full rounded-lg border border-border/60 bg-card px-3 py-3 text-left shadow-sm transition hover:border-border hover:bg-muted/30"
            >
              <span className="absolute -left-[18px] top-5 size-3 rounded-full border border-border bg-background group-hover:bg-primary/10" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{auditActionLabels[log.action]}</Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {formatAuditEntity(log.entity)}
                  </span>
                  {log.entityId ? (
                    <span className="text-xs text-muted-foreground">
                      {log.entityId}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTime(log.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{userLabel}</span>
                {log.requestId ? <span>• Req {log.requestId}</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
