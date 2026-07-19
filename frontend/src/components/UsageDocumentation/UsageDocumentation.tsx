"use client";

import * as React from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type UsageDocumentationItem = {
  id: string;
  title: string;
  content: React.ReactNode;
  searchText?: string;
};

type UsageDocumentationProps = {
  title: string;
  items?: UsageDocumentationItem[];
  children?: React.ReactNode;
  widthPx?: number;
};

const DEFAULT_WIDTH_PX = 380;

export function UsageDocumentation({
  title,
  items,
  children,
  widthPx = DEFAULT_WIDTH_PX,
}: UsageDocumentationProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const inset = document.querySelector(
      '[data-slot="sidebar-inset"]',
    ) as HTMLElement | null;
    if (!inset) return;

    const prevPaddingRight = inset.style.paddingRight;
    const prevTransition = inset.style.transition;

    inset.style.transition = inset.style.transition || "padding-right 150ms ease-out";
    inset.style.paddingRight = open ? `${widthPx}px` : prevPaddingRight || "";

    return () => {
      inset.style.paddingRight = prevPaddingRight;
      inset.style.transition = prevTransition;
    };
  }, [open, widthPx]);

  const filteredItems = React.useMemo(() => {
    const list = items ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const haystack = `${item.title} ${item.searchText ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  return (
    <>
      {!open ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full p-0 shadow-lg"
          title="Ajuda"
          aria-label="Ajuda"
        >
          <Info className="size-5" />
        </Button>
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex h-svh flex-col border-l border-border/60 bg-background/95 shadow-xl backdrop-blur transition-transform duration-150 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ width: `${widthPx}px` }}
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Como usar
            </div>
            <div className="truncate text-base font-semibold">{title}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setOpen(false)}
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
          {items ? (
            <>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar na documentação..."
                className="h-9"
              />

              {filteredItems.length === 0 ? (
                <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                  Nenhum resultado para &quot;{query.trim()}&quot;.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <details
                      key={item.id}
                      className="group rounded-lg border border-border/60 bg-muted/10 px-3 py-2 open:bg-background"
                    >
                      <summary className="cursor-pointer list-none select-none text-sm font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">{item.title}</span>
                          <span className="text-xs text-muted-foreground group-open:hidden">
                            Abrir
                          </span>
                          <span className="hidden text-xs text-muted-foreground group-open:inline">
                            Fechar
                          </span>
                        </div>
                      </summary>
                      <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                        {item.content}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </>
          ) : (
            children
          )}
        </div>
      </aside>
    </>
  );
}
