"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CommentUser = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

type CommentItem = {
  id: string;
  body: string;
  mentionUserIds: string[];
  author: {
    id: string | null;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  };
  createdAt: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item[0] ?? "")
    .join("")
    .toUpperCase();
}

function resolveMentionQuery(text: string, caretIndex: number) {
  const beforeCaret = text.slice(0, caretIndex);
  const match = beforeCaret.match(/(^|\s)@([^\s@]*)$/);
  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
  const start = beforeCaret.length - query.length - 1;
  if (start < 0) {
    return null;
  }

  return { query, start, end: caretIndex };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveMentionIdsInText(
  text: string,
  users: CommentUser[],
  candidateIds: string[],
) {
  return Array.from(new Set(candidateIds.filter(Boolean))).filter((mentionId) => {
    const user = users.find((entry) => entry.id === mentionId);
    if (!user?.name?.trim()) return false;
    const pattern = new RegExp(`(^|\\s)@${escapeRegExp(user.name)}(?=\\s|$)`, "i");
    return pattern.test(text);
  });
}

export function DetailCommentsPanel({
  comments,
  value,
  mentionUserIds,
  users,
  onValueChange,
  onMentionUserIdsChange,
  onSubmit,
  onDeleteComment,
  submitting = false,
  readOnly = false,
  emptyLabel = "Nenhum comentario ainda.",
}: {
  comments: CommentItem[];
  value: string;
  mentionUserIds: string[];
  users: CommentUser[];
  onValueChange: (next: string) => void;
  onMentionUserIdsChange: (next: string[]) => void;
  onSubmit: () => void;
  onDeleteComment?: (commentId: string) => void;
  submitting?: boolean;
  readOnly?: boolean;
  emptyLabel?: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [caretIndex, setCaretIndex] = React.useState(value.length);
  const [mentionIndex, setMentionIndex] = React.useState(0);
  const selectedMentionIds = React.useMemo(
    () => resolveMentionIdsInText(value, users, mentionUserIds),
    [mentionUserIds, users, value],
  );

  const selectedMentionUsers = React.useMemo(
    () => users.filter((user) => selectedMentionIds.includes(user.id)),
    [selectedMentionIds, users],
  );

  const availableMentionUsers = React.useMemo(
    () => users.filter((user) => !selectedMentionIds.includes(user.id)),
    [selectedMentionIds, users],
  );

  const activeMention = React.useMemo(() => {
    return resolveMentionQuery(value, caretIndex);
  }, [caretIndex, value]);

  const mentionSuggestions = React.useMemo(() => {
    if (!activeMention) return [];
    const normalizedQuery = activeMention.query.trim().toLocaleLowerCase();
    return availableMentionUsers
      .filter((user) => {
        if (!normalizedQuery) return true;
        const haystack = `${user.name} ${user.email ?? ""}`.toLocaleLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [activeMention, availableMentionUsers]);

  React.useEffect(() => {
    setMentionIndex(0);
  }, [activeMention?.query]);

  const applyMention = React.useCallback(
    (user: CommentUser) => {
      const textarea = textareaRef.current;
      const caretIndex = textarea?.selectionStart ?? value.length;
      const mention = resolveMentionQuery(value, caretIndex);
      if (!mention) return;

      const nextValue = `${value.slice(0, mention.start)}@${user.name} ${value.slice(mention.end)}`;
      const nextMentionIds = selectedMentionIds.includes(user.id)
        ? selectedMentionIds
        : [...selectedMentionIds, user.id];

      onValueChange(nextValue);
      onMentionUserIdsChange(nextMentionIds);

      const nextCaretIndex = mention.start + user.name.length + 2;
      setCaretIndex(nextCaretIndex);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCaretIndex, nextCaretIndex);
      });
    },
    [onMentionUserIdsChange, onValueChange, selectedMentionIds, value],
  );

  const handleTextareaKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mentionSuggestions.length) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((previous) =>
          previous + 1 >= mentionSuggestions.length ? 0 : previous + 1,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((previous) =>
          previous - 1 < 0 ? mentionSuggestions.length - 1 : previous - 1,
        );
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        const activeUser = mentionSuggestions[mentionIndex];
        if (activeUser) {
          event.preventDefault();
          applyMention(activeUser);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setMentionIndex(0);
      }
    },
    [applyMention, mentionIndex, mentionSuggestions],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-3 border-b border-border/50 pb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Discussao interna
        </div>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value;
              const nextMentionIds = resolveMentionIdsInText(
                nextValue,
                users,
                selectedMentionIds,
              );
              onValueChange(nextValue);
              onMentionUserIdsChange(nextMentionIds);
              setCaretIndex(event.target.selectionStart ?? nextValue.length);
            }}
            onKeyDown={handleTextareaKeyDown}
            onClick={(event) => setCaretIndex(event.currentTarget.selectionStart ?? value.length)}
            onKeyUp={(event) => setCaretIndex(event.currentTarget.selectionStart ?? value.length)}
            onSelect={(event) => setCaretIndex(event.currentTarget.selectionStart ?? value.length)}
            placeholder="Escreva um comentario para o time. Use @ para mencionar pessoas."
            className="min-h-[120px] rounded-none border-0 border-b border-border/60 bg-transparent px-0 py-2 shadow-none focus-visible:border-primary focus-visible:ring-0"
            readOnly={readOnly}
          />

          {!readOnly && activeMention && mentionSuggestions.length ? (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-md border border-border bg-background shadow-sm">
              <div className="border-b border-border/60 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Mencionar pessoas
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {mentionSuggestions.map((user, index) => (
                  <button
                    key={user.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                      index === mentionIndex
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground hover:bg-muted/60",
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applyMention(user);
                    }}
                  >
                    <span className="truncate font-medium">{user.name}</span>
                    {user.email ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {!readOnly ? (
          <div className="space-y-3">
            {selectedMentionUsers.length ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedMentionUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="outline"
                    className="gap-1 rounded-full px-2 text-[10px]"
                  >
                    @{user.name}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        onMentionUserIdsChange(
                          selectedMentionIds.filter((entry) => entry !== user.id),
                        )
                      }
                    >
                      x
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={onSubmit}
                disabled={submitting || !value.trim()}
              >
                {submitting ? "Enviando..." : "Comentar"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {comments.length ? (
        <div className="space-y-4">
          {comments.map((comment) => {
            const mentions = comment.mentionUserIds
              .map((mentionId) => users.find((user) => user.id === mentionId))
              .filter(Boolean) as CommentUser[];

            return (
              <article key={comment.id} className="space-y-2 border-b border-border/40 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                    {initials(comment.author.name)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <div className="text-sm font-medium text-foreground">
                        {comment.author.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {comment.createdAt.slice(0, 16).replace("T", ", ")}
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-foreground">
                      {comment.body}
                    </div>
                    {mentions.length ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {mentions.map((user) => (
                          <Badge
                            key={`${comment.id}:${user.id}`}
                            variant="outline"
                            className={cn("rounded-full px-2 text-[10px]", "border-sky-500/20 bg-sky-500/5 text-sky-700")}
                          >
                            @{user.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {onDeleteComment ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onDeleteComment(comment.id)}
                    >
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{emptyLabel}</div>
      )}
    </div>
  );
}
