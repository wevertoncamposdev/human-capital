"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailAuditFeed } from "@/web-client/detail/DetailAuditFeed";
import { DetailCommentsPanel } from "@/web-client/detail/DetailCommentsPanel";
import { DetailNotesPanel } from "@/web-client/detail/DetailNotesPanel";
import { DetailSideTabs, type DetailSideTabItem } from "@/web-client/detail/DetailSideTabs";
import { DetailTagsField } from "@/web-client/detail/DetailTagsField";
import { buildGroupedAuditFeed } from "@/web-client/detail/audit-feed-utils";
import type { DetailShellAuditContext } from "@/web-client/detail/DetailShellEngine";
import type {
  DetailAttachmentItem,
  DetailCommentDraft,
  DetailCommentItem,
  DetailCommentUser,
  DetailContextItem,
  DetailHistoryItem,
} from "@/web-client/registry/types";

function StandardDetailContextPanel({
  items,
  emptyLabel = "Nenhum contexto disponivel.",
}: {
  items: DetailContextItem[];
  emptyLabel?: string;
}) {
  if (!items.length) {
    return <div className="text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-3 text-sm">
      {items.map((item, index) => (
        <div
          key={item.key}
          className={index === items.length - 1 ? "flex items-center justify-between gap-3" : "flex items-center justify-between gap-3 border-b border-border/50 pb-3"}
        >
          <span className="text-muted-foreground">{item.label}</span>
          <span className="text-right text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function StandardDetailHistoryPanel({
  items,
  emptyLabel = "Nenhum historico disponivel.",
}: {
  items: DetailHistoryItem[];
  emptyLabel?: string;
}) {
  if (!items.length) {
    return <div className="text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="space-y-1 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium text-foreground">{item.title}</div>
            {item.createdAt ? (
              <div className="text-[11px] text-muted-foreground">
                {item.createdAt.slice(0, 16).replace("T", ", ")}
              </div>
            ) : null}
          </div>
          {item.description ? (
            <div className="text-sm text-muted-foreground">{item.description}</div>
          ) : null}
          {item.meta ? <div className="text-xs text-muted-foreground">{item.meta}</div> : null}
        </article>
      ))}
    </div>
  );
}

function StandardDetailAttachmentsPanel({
  items,
  emptyLabel = "Nenhum anexo disponivel.",
  onOpen,
  onUpload,
  onDelete,
  readOnly,
}: {
  items: DetailAttachmentItem[];
  emptyLabel?: string;
  onOpen?: (attachmentId: string) => void;
  onUpload?: () => void;
  onDelete?: (attachmentId: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-4">
      {onUpload && !readOnly ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={onUpload}>
            Novo anexo
          </Button>
        </div>
      ) : null}

      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => {
            const content = (
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-foreground">{item.label}</div>
                  {onDelete && !readOnly ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDelete(item.id);
                      }}
                    >
                      Excluir
                    </Button>
                  ) : null}
                </div>
                {item.description ? (
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                ) : null}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.mimeType ? (
                    <Badge variant="outline" className="rounded-full px-2 text-[10px]">
                      {item.mimeType}
                    </Badge>
                  ) : null}
                  {item.sizeLabel ? (
                    <Badge variant="outline" className="rounded-full px-2 text-[10px]">
                      {item.sizeLabel}
                    </Badge>
                  ) : null}
                  {item.statusLabel ? (
                    <Badge variant="outline" className="rounded-full px-2 text-[10px]">
                      {item.statusLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>
            );

            if (item.href) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block border-b border-border/50 pb-3 last:border-b-0 last:pb-0"
                >
                  {content}
                </a>
              );
            }

            if (onOpen) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="block w-full border-b border-border/50 pb-3 text-left last:border-b-0 last:pb-0"
                >
                  {content}
                </button>
              );
            }

            return (
              <div key={item.id} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                {content}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{emptyLabel}</div>
      )}
    </div>
  );
}

export function StandardDetailMetadataSide({
  mode,
  readOnly = false,
  detailAudit,
  auditVisibleCount,
  onAuditVisibleCountChange,
  canAudit = false,
  comments,
  notes,
  tags,
  contextItems = [],
  contextPanel,
  history,
  attachments,
  defaultTab = "activity",
}: {
  mode: "create" | "edit";
  readOnly?: boolean;
  detailAudit?: DetailShellAuditContext["detailAudit"];
  auditVisibleCount?: number;
  onAuditVisibleCountChange?: React.Dispatch<React.SetStateAction<number>>;
  canAudit?: boolean;
  comments?: {
    items: DetailCommentItem[];
    draft: DetailCommentDraft;
    users: DetailCommentUser[];
    onDraftChange: React.Dispatch<React.SetStateAction<DetailCommentDraft>>;
    onSubmit: () => void;
    onDelete?: (commentId: string) => void;
    submitting?: boolean;
    readOnly?: boolean;
    emptyLabel?: string;
    hidden?: boolean;
  };
  notes?: {
    value: string | null | undefined;
    onChange: (next: string | null) => void;
    onBlur: () => void;
    readOnly?: boolean;
    hidden?: boolean;
    label?: string;
    placeholder?: string;
  };
  tags?: {
    value: string[];
    onChange: (next: string[]) => void;
    onCommit?: (next: string[]) => void;
    readOnly?: boolean;
    hidden?: boolean;
    label?: string;
    placeholder?: string;
    helperText?: string;
    emptyLabel?: string;
  };
  contextItems?: DetailContextItem[];
  contextPanel?: React.ReactNode;
  history?: {
    items: DetailHistoryItem[];
    hidden?: boolean;
    emptyLabel?: string;
  };
  attachments?: {
    items: DetailAttachmentItem[];
    onOpen?: (attachmentId: string) => void;
    onUpload?: () => void;
    onDelete?: (attachmentId: string) => void;
    readOnly?: boolean;
    hidden?: boolean;
    emptyLabel?: string;
  };
  defaultTab?: DetailSideTabItem["value"];
}) {
  const auditCount = buildGroupedAuditFeed(detailAudit?.logs ?? []).length;

  const tabs = React.useMemo<DetailSideTabItem[]>(() => {
    const nextTabs: DetailSideTabItem[] = [
      {
        value: "activity",
        label: "Auditoria",
        badge: canAudit && auditCount ? auditCount : undefined,
        content:
          mode === "edit" && canAudit && detailAudit && onAuditVisibleCountChange ? (
            <DetailAuditFeed
              mode="edit"
              auditState={detailAudit}
              auditVisibleCount={auditVisibleCount ?? 24}
              onAuditVisibleCountChange={onAuditVisibleCountChange}
            />
          ) : (
            <div className="border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
              {mode === "create"
                ? "A auditoria aparece apos salvar o registro."
                : "Nenhum evento de auditoria registrado."}
            </div>
          ),
      },
    ];

    if (comments && !comments.hidden) {
      nextTabs.push({
        value: "comments",
        label: "Comentarios",
        badge: comments.items.length || undefined,
        content: (
          <DetailCommentsPanel
            comments={comments.items}
            value={comments.draft.body}
            mentionUserIds={comments.draft.mentionUserIds}
            users={comments.users}
            onValueChange={(next) =>
              comments.onDraftChange((previous) => ({ ...previous, body: next }))
            }
            onMentionUserIdsChange={(next) =>
              comments.onDraftChange((previous) => ({
                ...previous,
                mentionUserIds: next,
              }))
            }
            onSubmit={comments.onSubmit}
            onDeleteComment={comments.onDelete}
            submitting={comments.submitting}
            readOnly={comments.readOnly ?? readOnly}
            emptyLabel={comments.emptyLabel}
          />
        ),
      });
    }

    if (notes && !notes.hidden) {
      nextTabs.push({
        value: "notes",
        label: notes.label ?? "Notas internas",
        content: (
          <DetailNotesPanel
            value={notes.value}
            onChange={notes.onChange}
            onBlur={notes.onBlur}
            readOnly={notes.readOnly ?? readOnly}
            placeholder={notes.placeholder}
          />
        ),
      });
    }

    if (tags && !tags.hidden) {
      nextTabs.push({
        value: "tags",
        label: tags.label ?? "Tags",
        badge: tags.value.length || undefined,
        content: (
          <DetailTagsField
            value={tags.value}
            onChange={tags.onChange}
            onCommit={tags.onCommit}
            readOnly={tags.readOnly ?? readOnly}
            label={tags.label ?? "Tags"}
            placeholder={tags.placeholder}
            helperText={tags.helperText}
            emptyLabel={tags.emptyLabel}
          />
        ),
      });
    }

    if (attachments && !attachments.hidden) {
      nextTabs.push({
        value: "attachments",
        label: "Anexos",
        badge: attachments.items.length || undefined,
        content: (
          <StandardDetailAttachmentsPanel
            items={attachments.items}
            onOpen={attachments.onOpen}
            onUpload={attachments.onUpload}
            onDelete={attachments.onDelete}
            readOnly={attachments.readOnly ?? readOnly}
            emptyLabel={attachments.emptyLabel}
          />
        ),
      });
    }

    if (history && !history.hidden) {
      nextTabs.push({
        value: "history",
        label: "Historico",
        badge: history.items.length || undefined,
        content: (
          <StandardDetailHistoryPanel
            items={history.items}
            emptyLabel={history.emptyLabel}
          />
        ),
      });
    }

    nextTabs.push({
      value: "context",
      label: "Contexto",
      content:
        contextPanel ?? <StandardDetailContextPanel items={contextItems} />,
    });

    return nextTabs;
  }, [
    attachments,
    auditCount,
    auditVisibleCount,
    canAudit,
    comments,
    contextPanel,
    contextItems,
    detailAudit,
    history,
    mode,
    notes,
    onAuditVisibleCountChange,
    readOnly,
    tags,
  ]);

  return <DetailSideTabs tabs={tabs} defaultValue={defaultTab} />;
}
