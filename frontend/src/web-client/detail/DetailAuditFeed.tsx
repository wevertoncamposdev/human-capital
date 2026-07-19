"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveMediaUrl } from "@/lib/api";
import { formatDateTimePtBR } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { DetailAuditFeedState } from "@/web-client/detail/audit-types";
import {
  buildAuditDaySections,
  buildGroupedAuditFeed,
  initialsFromLabel,
  isAuditRichTextValue,
  normalizeAuditDialogValue,
  pickAvatarPalette,
  resolveAuditActionLabel,
  resolveAuditChangedFieldsSummary,
  resolveAuditSummary,
  resolveAuditTone,
  resolveGroupedAuditHeadline,
  type GroupedAuditFeedItem,
} from "@/web-client/detail/audit-feed-utils";
import { ModuleEmptyState } from "@/web-client/ui/ModulePrimitives";

export type DetailAuditFeedProps = {
  mode: "create" | "edit" | "view";
  auditState?: DetailAuditFeedState;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
  emptyLabel?: string;
  createHintLabel?: string;
  getSourcePriority?: (value: string) => number;
  maxHeightClassName?: string;
};

function AuditDiffDialog({
  group,
  open,
  onOpenChange,
}: {
  group: GroupedAuditFeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!group) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[min(96vw,56rem)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle>{resolveGroupedAuditHeadline(group)}</DialogTitle>
          <DialogDescription className="pt-1">
            {formatDateTimePtBR(group.createdAt)}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-3">
            {group.sourceLabels.map((label) => (
              <Badge
                key={`${group.id}-${label}`}
                variant="outline"
                className="rounded-full border-border/60 bg-transparent px-2 text-[10px]"
              >
                {label}
              </Badge>
            ))}
            <Badge
              className={cn(
                "rounded-full px-2 text-[10px]",
                resolveAuditTone(group.action).badgeClass,
              )}
            >
              {resolveAuditActionLabel(group.action)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {group.rows.map((row) => {
              const beforeValue = normalizeAuditDialogValue(row.before, row.beforeLabel);
              const afterValue = normalizeAuditDialogValue(row.after, row.afterLabel);
              const richTextChanged =
                isAuditRichTextValue(row.before) || isAuditRichTextValue(row.after);

              return (
                <section
                  key={`${group.id}-${row.sourceLabel}-${row.key}`}
                  className="rounded-lg border border-border/60 bg-background/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {row.label}
                      </div>
                      <div className="pt-1 text-xs text-muted-foreground">
                        {row.sourceLabel}
                      </div>
                    </div>
                    {richTextChanged ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-border/60 bg-transparent px-2 text-[10px] text-muted-foreground"
                      >
                        Texto rico
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Antes
                      </div>
                      <div className="min-h-[5rem] whitespace-pre-wrap break-words rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                        {beforeValue}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Depois
                      </div>
                      <div className="min-h-[5rem] whitespace-pre-wrap break-words rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                        {afterValue}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DetailAuditFeed({
  mode,
  auditState,
  auditVisibleCount,
  onAuditVisibleCountChange,
  emptyLabel = "Sem auditoria.",
  createHintLabel = "Salve o registro para ver a auditoria.",
  getSourcePriority,
  maxHeightClassName = "h-full min-h-0",
}: DetailAuditFeedProps) {
  const auditLoading = auditState?.loading ?? false;
  const auditLogs = auditState?.logs;
  const auditError = auditState?.error ?? null;
  const [selectedGroup, setSelectedGroup] = React.useState<GroupedAuditFeedItem | null>(null);

  const auditGroups = React.useMemo(
    () => buildGroupedAuditFeed(auditLogs ?? [], { getSourcePriority }),
    [auditLogs, getSourcePriority],
  );
  const visibleGroups = auditGroups.slice(0, Math.min(auditVisibleCount, auditGroups.length));
  const visibleDaySections = React.useMemo(
    () => buildAuditDaySections(visibleGroups),
    [visibleGroups],
  );

  if (mode === "create") {
    return (
      <ModuleEmptyState
        title="Auditoria"
        description={createHintLabel}
        compact
      />
    );
  }

  if (auditError) {
    return (
      <ModuleEmptyState
        title="Auditoria"
        description={auditError}
        compact
      />
    );
  }

  if (auditLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="border-b border-border/50 pb-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 size-8 animate-pulse rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!auditGroups.length) {
    return (
      <ModuleEmptyState
        title="Sem atividade"
        description={emptyLabel}
        compact
      />
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className={cn("min-h-0 flex-1 overflow-y-auto pr-1", maxHeightClassName)}>
          <div className="space-y-5">
            {visibleDaySections.map((section) => (
              <section key={section.key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/60" />
                  <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {section.label}
                  </div>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                <div className="space-y-0">
                  {section.items.map((group) => {
                    const primaryLog = group.logs[0]!;
                    const actor =
                      primaryLog.user?.name ?? primaryLog.user?.email ?? "Sistema";
                    const tone = resolveAuditTone(group.action);
                    const initials = initialsFromLabel(actor);
                    const palette = pickAvatarPalette(primaryLog.userId ?? actor);
                    const avatarRaw = primaryLog.user?.avatarUrl ?? null;
                    const avatarSrc = avatarRaw ? resolveMediaUrl(avatarRaw) : "";
                    const changedFields = resolveAuditChangedFieldsSummary(group.rows);

                    return (
                      <article key={group.id} className="border-b border-border/35 py-4">
                        <div className="flex items-start gap-3">
                          <span className={cn("mt-3 size-2 rounded-full", tone.dotClass)} />

                          <Avatar className="mt-0.5 size-8 border border-border/60" title={actor}>
                            {avatarSrc ? <AvatarImage src={avatarSrc} alt={actor} /> : null}
                            <AvatarFallback className={cn(palette.bg, palette.text)}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-[13px] font-medium text-foreground">
                                {actor}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {formatDateTimePtBR(group.createdAt)}
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {group.sourceLabels.map((sourceLabel) => (
                                <Badge
                                  key={`${group.id}-${sourceLabel}`}
                                  variant="outline"
                                  className="h-5 rounded-full border-border/60 bg-transparent px-2 text-[9px] font-medium text-muted-foreground"
                                >
                                  {sourceLabel}
                                </Badge>
                              ))}
                              <Badge
                                className={cn(
                                  "h-5 rounded-full px-2 text-[9px]",
                                  tone.badgeClass,
                                )}
                              >
                                {resolveAuditActionLabel(group.action)}
                              </Badge>
                              {group.logs.length > 1 ? (
                                <span className="text-[10px] text-muted-foreground">
                                  +{group.logs.length - 1} updates
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 text-[13px] font-medium leading-5 text-foreground">
                              {resolveGroupedAuditHeadline(group)}
                            </div>

                            {group.rows.length ? (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {changedFields.labels.map((label) => (
                                  <span
                                    key={`${group.id}-${label}`}
                                    className="inline-flex items-center rounded-full bg-muted/35 px-2 py-0.5 text-[11px] text-muted-foreground"
                                  >
                                    {label}
                                  </span>
                                ))}
                                {changedFields.hiddenCount ? (
                                  <span className="inline-flex items-center rounded-full bg-muted/35 px-2 py-0.5 text-[11px] text-muted-foreground">
                                    +{changedFields.hiddenCount}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <div className="mt-2 text-[12px] text-muted-foreground">
                                {resolveAuditSummary(primaryLog)}
                              </div>
                            )}

                            {group.rows.length ? (
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-none border-b border-border/60 px-1 text-[11px]"
                                  onClick={() => setSelectedGroup(group)}
                                >
                                  Ver alteracoes
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        {auditVisibleCount < auditGroups.length ? (
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-none border-b border-border/60 px-1"
              onClick={() =>
                onAuditVisibleCountChange((prev) => Math.min(prev + 24, auditGroups.length))
              }
            >
              Mostrar mais
            </Button>
          </div>
        ) : null}
      </div>

      <AuditDiffDialog
        group={selectedGroup}
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedGroup(null);
          }
        }}
      />
    </>
  );
}
