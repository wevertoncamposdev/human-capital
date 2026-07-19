"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SearchFacet = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  tone?: "default" | "group" | "analysis";
  analysisKind?: "group" | "time" | "metric" | "chart" | "sort";
};

function getFacetClasses(facet: SearchFacet) {
  const base =
    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]";

  if (facet.tone === "group") {
    return `${base} border-border/45 bg-muted/50 text-foreground`;
  }

  if (facet.tone === "analysis") {
    switch (facet.analysisKind) {
      case "group":
        return `${base} border-border/45 bg-muted/50 text-foreground`;
      case "time":
        return `${base} border-sky-500/15 bg-sky-500/10 text-foreground`;
      case "metric":
        return `${base} border-emerald-500/15 bg-emerald-500/10 text-foreground`;
      case "chart":
        return `${base} border-cyan-500/15 bg-cyan-500/10 text-foreground`;
      case "sort":
        return `${base} border-amber-500/20 bg-amber-500/10 text-foreground`;
      default:
        return `${base} border-primary/15 bg-primary/10 text-foreground`;
    }
  }

  return `${base} border-border/35 bg-muted/35 text-muted-foreground`;
}

function getFacetIconClasses(facet: SearchFacet) {
  if (facet.tone === "group") {
    return "shrink-0 text-muted-foreground";
  }

  if (facet.tone === "analysis") {
    switch (facet.analysisKind) {
      case "group":
        return "shrink-0 text-muted-foreground";
      case "time":
        return "shrink-0 text-sky-600";
      case "metric":
        return "shrink-0 text-emerald-600";
      case "chart":
        return "shrink-0 text-cyan-600";
      case "sort":
        return "shrink-0 text-amber-600";
      default:
        return "shrink-0 text-primary";
    }
  }

  return "shrink-0 text-muted-foreground";
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Pesquisar...",
  className,
  facets,
  rightSlot,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  facets?: SearchFacet[];
  rightSlot?: React.ReactNode;
}) {
  const showFacets = Boolean(facets?.length);
  const showRight = Boolean(rightSlot);
  const facetsViewportRef = React.useRef<HTMLDivElement | null>(null);
  const facetMeasureRefs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const [availableFacetWidth, setAvailableFacetWidth] = React.useState<number>(0);
  const [visibleFacetCount, setVisibleFacetCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!showFacets) {
      setAvailableFacetWidth(0);
      setVisibleFacetCount(null);
      return;
    }

    const viewport = facetsViewportRef.current;
    if (!viewport) return;

    const updateWidth = () => {
      setAvailableFacetWidth(viewport.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [showFacets]);

  React.useEffect(() => {
    if (!showFacets || !facets?.length || !availableFacetWidth) {
      setVisibleFacetCount(null);
      return;
    }

    const gapWidth = 4;
    const collapsedFacetWidth = 44;
    const reservedInputWidth =
      availableFacetWidth < 420 ? 96 : availableFacetWidth < 640 ? 132 : 180;
    const availableChipWidth = Math.max(
      availableFacetWidth - reservedInputWidth - gapWidth,
      0,
    );

    if (!availableChipWidth) {
      setVisibleFacetCount(0);
      return;
    }

    const facetWidths = facets.map((_, index) => facetMeasureRefs.current[index]?.offsetWidth ?? 0);

    let consumedWidth = 0;
    let nextVisibleCount = 0;

    for (let index = 0; index < facetWidths.length; index += 1) {
      const width = facetWidths[index];
      const nextHiddenCount = facetWidths.length - (index + 1);
      const nextConsumedWidth = consumedWidth + width + (index > 0 ? gapWidth : 0);
      const reserveWidth = nextHiddenCount > 0 ? gapWidth + collapsedFacetWidth : 0;

      if (nextConsumedWidth + reserveWidth > availableChipWidth) {
        break;
      }

      consumedWidth = nextConsumedWidth;
      nextVisibleCount = index + 1;
    }

    setVisibleFacetCount(nextVisibleCount);
  }, [availableFacetWidth, facets, showFacets]);

  const resolvedVisibleFacetCount =
    visibleFacetCount == null ? facets?.length ?? 0 : visibleFacetCount;
  const visibleFacets = facets?.slice(0, resolvedVisibleFacetCount) ?? [];
  const hiddenFacets = facets?.slice(resolvedVisibleFacetCount) ?? [];
  const hiddenFacetLabel = hiddenFacets.map((facet) => facet.label).join(" • ");

  const renderFacet = (facet: SearchFacet) => (
    <span
      key={facet.key}
      className={getFacetClasses(facet)}
      title={facet.label}
    >
      {facet.icon ? (
        <span className={getFacetIconClasses(facet)}>{facet.icon}</span>
      ) : null}
      <span className="max-w-[12rem] truncate">{facet.label}</span>
      {facet.onRemove ? (
        <button
          type="button"
          className="ml-0.5 inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          title={facet.removeLabel ?? "Remover"}
          aria-label={facet.removeLabel ?? "Remover"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            facet.onRemove?.();
          }}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </span>
  );

  const renderFacetIcon = (facet: SearchFacet) =>
    facet.icon ? <span className={getFacetIconClasses(facet)}>{facet.icon}</span> : null;

  if (showFacets || showRight) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex min-h-10 w-full items-center gap-2 border-b border-border/60 bg-transparent px-0 py-1 transition-colors focus-within:border-primary">
          <Search className="size-4 shrink-0 text-muted-foreground" />

          {showFacets ? (
            <div
              ref={facetsViewportRef}
              className="relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
            >
              <div
                className="pointer-events-none absolute left-0 top-0 -z-10 inline-flex items-center gap-1 opacity-0"
                aria-hidden="true"
              >
                {facets?.map((facet, index) => (
                  <span
                    key={`${facet.key}:measure`}
                    ref={(node) => {
                      facetMeasureRefs.current[index] = node;
                    }}
                    className={getFacetClasses(facet)}
                  >
                    {renderFacetIcon(facet)}
                    <span className="max-w-[12rem] truncate">{facet.label}</span>
                    {facet.onRemove ? (
                      <span className="inline-flex size-4 items-center justify-center">
                        <X className="size-3.5" />
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>

              {visibleFacets.map((facet) => renderFacet(facet))}

              {hiddenFacets.length ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center rounded-full bg-muted/45 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                      title={hiddenFacetLabel}
                      aria-label={`Mostrar ${hiddenFacets.length} filtros ocultos`}
                    >
                      +{hiddenFacets.length}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[280px] p-2">
                    <div className="mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Itens ocultos
                    </div>
                    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                      {hiddenFacets.map((facet) => (
                        <div
                          key={`${facet.key}:hidden`}
                          className="flex items-start gap-2 rounded-md border border-border/50 bg-background/90 px-2.5 py-2"
                        >
                          {renderFacetIcon(facet)}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-foreground" title={facet.label}>
                              {facet.label}
                            </div>
                          </div>
                          {facet.onRemove ? (
                            <button
                              type="button"
                              className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title={facet.removeLabel ?? "Remover"}
                              aria-label={facet.removeLabel ?? "Remover"}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                facet.onRemove?.();
                              }}
                            >
                              <X className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-8 min-w-[96px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground sm:min-w-[120px]"
              />
            </div>
          ) : (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          )}

          {rightSlot ? (
            <div className="shrink-0 border-l border-border/40 pl-3">{rightSlot}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-2 border-b border-border/60 px-0 transition-colors focus-within:border-primary",
        className,
      )}
    >
      <Search className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
