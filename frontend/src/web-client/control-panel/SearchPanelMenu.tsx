"use client";

import * as React from "react";
import { Check, SlidersHorizontal, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdvancedFilterBuilder } from "@/web-client/control-panel/AdvancedFilterBuilder";
import {
  loadFavorites,
  saveFavorites,
  type FavoriteDefinition,
} from "@/web-client/control-panel/favorites-storage";
import type { Domain, DomainCombinator } from "@/web-client/domain/types";
import type { SearchViewDefinition } from "@/web-client/search/types";
import { ModuleEmptyState } from "@/web-client/ui/ModulePrimitives";

type SearchPanelGroupByOption = {
  field: string;
  label: string;
};

function PanelSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-border/60" />;
}

function renderGroupButtons({
  options,
  groupBy,
  onGroupByChange,
  groupByMode,
  allowEmptyGroupBy,
}: {
  options: SearchPanelGroupByOption[];
  groupBy: string[];
  onGroupByChange: (next: string[]) => void;
  groupByMode: "single" | "multi";
  allowEmptyGroupBy: boolean;
}) {
  if (!options.length) {
    return (
      <ModuleEmptyState
        title={null}
        description="Nenhuma opcao."
        compact
        className="px-0 py-3"
      />
    );
  }

  return (
    <div className="space-y-1">
      {options.map((option) => {
        const isActive = groupBy.includes(option.field);

        return (
          <button
            key={option.field}
            type="button"
            className={[
              "flex w-full items-center justify-between rounded-sm px-2 py-1 text-left text-xs",
              isActive
                ? "bg-muted/40 text-foreground"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            ].join(" ")}
            onClick={(event) => {
              event.preventDefault();

              if (groupByMode === "multi") {
                onGroupByChange(
                  isActive
                    ? groupBy.filter((field) => field !== option.field)
                    : [...groupBy, option.field],
                );
                return;
              }

              if (isActive) {
                if (allowEmptyGroupBy) onGroupByChange([]);
                return;
              }

              onGroupByChange([option.field]);
            }}
            title="Organizar por"
          >
            <span className="truncate">{option.label}</span>
            {isActive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Check className="size-3.5" />
                Ativo
              </span>
            ) : null}
          </button>
        );
      })}

      {(groupByMode === "multi" || allowEmptyGroupBy) && groupBy.length ? (
        <button
          type="button"
          className="w-full rounded-sm px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          onClick={(event) => {
            event.preventDefault();
            onGroupByChange([]);
          }}
        >
          Limpar agrupamento
        </button>
      ) : null}
    </div>
  );
}

export function SearchPanelMenu<TState extends Record<string, unknown>>({
  actionId,
  searchView,
  domain,
  onDomainChange,
  groupBy,
  onGroupByChange,
  groupByMode = "single",
  allowEmptyGroupBy = false,
  groupByOptions,
  analysisTitle = "Analise",
  analysisSlot,
  hasActiveFilters = false,
  hasActiveAnalysis = false,
  onClearFilters,
  onResetAnalysis,
  onClearAll,
  variant = "wide",
  trigger,
  valueSuggestions,
  snapshot,
  onApplyFavorite,
}: {
  actionId: string;
  searchView: SearchViewDefinition;
  domain: Domain;
  onDomainChange: (next: Domain) => void;
  groupBy: string[];
  onGroupByChange: (next: string[]) => void;
  groupByMode?: "single" | "multi";
  allowEmptyGroupBy?: boolean;
  groupByOptions?: SearchPanelGroupByOption[];
  analysisTitle?: string;
  analysisSlot?: React.ReactNode;
  hasActiveFilters?: boolean;
  hasActiveAnalysis?: boolean;
  onClearFilters?: () => void;
  onResetAnalysis?: () => void;
  onClearAll?: () => void;
  variant?: "wide" | "compact";
  trigger?: React.ReactNode;
  valueSuggestions?: (fieldName: string) => string[];
  snapshot: TState;
  onApplyFavorite: (state: TState) => void;
}) {
  const storageKey = `favorites:${actionId}`;
  const resolvedGroupByOptions = groupByOptions ?? searchView.groupBy ?? [];
  const hasAdvancedFilters = searchView.fields.length > 0;
  const features = searchView.features ?? {};
  const allowPresets = features.presets ?? true;
  const allowAdvancedFilters = features.advancedFilters ?? true;
  const allowGroupBy = (features.groupBy ?? true) && resolvedGroupByOptions.length > 0;
  const allowFavorites = features.favorites ?? true;
  const allowClearAll = features.clearAll ?? true;
  const hasAnalysis = Boolean(analysisSlot);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [favorites, setFavorites] = React.useState<Array<FavoriteDefinition<TState>>>([]);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [customFilterOpen, setCustomFilterOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [pendingDomain, setPendingDomain] = React.useState<Domain>(domain);
  const allowedCombinators = React.useMemo<DomainCombinator[]>(() => {
    const configured = searchView.filterCombinators?.filter(Boolean);
    return configured?.length ? configured : ["and"];
  }, [searchView.filterCombinators]);

  React.useEffect(() => {
    setFavorites(loadFavorites<TState>(storageKey));
  }, [storageKey]);

  React.useEffect(() => {
    if (!customFilterOpen) return;
    setPendingDomain(domain);
  }, [customFilterOpen, domain]);

  const persist = React.useCallback(
    (next: Array<FavoriteDefinition<TState>>) => {
      setFavorites(next);
      saveFavorites(storageKey, next);
    },
    [storageKey],
  );

  const handleClearAll = React.useCallback(() => {
    if (onClearAll) {
      onClearAll();
      return;
    }

    if (onClearFilters) {
      onClearFilters();
    } else {
      onDomainChange(null);
    }

    if (onResetAnalysis) {
      onResetAnalysis();
    } else {
      onGroupByChange([]);
    }
  }, [onClearAll, onClearFilters, onDomainChange, onGroupByChange, onResetAnalysis]);

  const filtersPanel = (
    <PanelSection title="Filtros" icon={<SlidersHorizontal className="size-4" />}>
      {allowPresets && searchView.presets?.length ? (
        <div className="space-y-1">
          {searchView.presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="flex w-full items-center justify-between rounded-sm px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              onClick={(event) => {
                event.preventDefault();
                onDomainChange(preset.domain);
              }}
            >
              <span className="truncate">{preset.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="flex w-full items-center justify-between rounded-sm px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-50"
        disabled={!hasAdvancedFilters || !allowAdvancedFilters}
        onClick={(event) => {
          event.preventDefault();
          setMenuOpen(false);
          setCustomFilterOpen(true);
        }}
      >
        <span className="truncate">Filtro personalizado...</span>
      </button>

      {!hasAdvancedFilters || !allowAdvancedFilters ? (
        <ModuleEmptyState
          title={null}
          description="Nenhum filtro configurado."
          compact
          className="px-0 py-3"
        />
      ) : null}
    </PanelSection>
  );

  const groupByPanel = allowGroupBy ? (
    <PanelSection title="Agrupar por">
      {renderGroupButtons({
        options: resolvedGroupByOptions,
        groupBy,
        onGroupByChange,
        groupByMode,
        allowEmptyGroupBy,
      })}
    </PanelSection>
  ) : null;

  const analysisPanel = hasAnalysis ? (
    <PanelSection title={analysisTitle}>{analysisSlot}</PanelSection>
  ) : null;

  const favoritesPanel = allowFavorites ? (
    <PanelSection title="Favoritos" icon={<Star className="size-4" />}>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground"
        onClick={(event) => {
          event.preventDefault();
          setName("");
          setMenuOpen(false);
          setSaveOpen(true);
        }}
      >
        <Star className="size-4" />
        Salvar pesquisa atual...
      </button>

      <div className="max-h-[40vh] space-y-1 overflow-auto pr-1">
        {favorites.length ? (
          favorites.map((favorite) => (
            <div
              key={favorite.id}
              className="flex items-center justify-between gap-2 rounded-sm px-2 py-1 text-xs hover:bg-muted/30"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                title={favorite.name}
                onClick={(event) => {
                  event.preventDefault();
                  onApplyFavorite(favorite.state);
                }}
              >
                {favorite.name}
              </button>
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded hover:bg-muted"
                title="Remover"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!window.confirm(`Remover favorito "${favorite.name}"?`)) return;
                  persist(favorites.filter((item) => item.id !== favorite.id));
                }}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </button>
            </div>
          ))
        ) : (
          <ModuleEmptyState
            title={null}
            description="Nenhum favorito salvo."
            compact
            className="px-0 py-3"
          />
        )}
      </div>
    </PanelSection>
  ) : null;

  return (
    <>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Pesquisar"
              aria-label="Pesquisar"
            >
              <SlidersHorizontal className="size-4" />
            </Button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={variant === "compact" ? "end" : "start"}
          sideOffset={6}
          className={
            variant === "compact"
              ? "w-[min(96vw,42rem)] rounded-lg border border-border/60 bg-background/95 p-2 shadow-xl"
              : "w-[min(96vw,72rem)] rounded-lg border border-border/60 bg-background/95 p-2 shadow-xl"
          }
        >
          {variant === "compact" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-3 rounded-lg border border-border/60 bg-background px-3 py-3">
                {filtersPanel}
                {analysisPanel ? <Divider /> : null}
                {analysisPanel}
                {hasActiveFilters || hasActiveAnalysis ? <Divider /> : null}
                {hasActiveFilters && onClearFilters ? (
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault();
                      onClearFilters();
                    }}
                  >
                    Limpar filtros
                  </button>
                ) : null}
                {hasActiveAnalysis && onResetAnalysis ? (
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault();
                      onResetAnalysis();
                    }}
                  >
                    Resetar analise
                  </button>
                ) : null}
                {allowClearAll && (hasActiveFilters || hasActiveAnalysis) ? (
                  <>
                    <button
                      type="button"
                      className="w-full rounded-sm px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      onClick={(event) => {
                        event.preventDefault();
                        handleClearAll();
                      }}
                    >
                      Limpar tudo
                    </button>
                  </>
                ) : null}
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-background px-3 py-3">
                {groupByPanel}
                {groupByPanel && favoritesPanel ? <Divider /> : null}
                {favoritesPanel}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.95fr)]">
              <div className="space-y-3 rounded-lg border border-border/60 bg-background p-3">
                {filtersPanel}
                {analysisPanel ? <Divider /> : null}
                {analysisPanel}
                {hasActiveFilters || hasActiveAnalysis ? <Divider /> : null}
                {hasActiveFilters && onClearFilters ? (
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault();
                      onClearFilters();
                    }}
                  >
                    Limpar filtros
                  </button>
                ) : null}
                {hasActiveAnalysis && onResetAnalysis ? (
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault();
                      onResetAnalysis();
                    }}
                  >
                    Resetar analise
                  </button>
                ) : null}
                {allowClearAll && (hasActiveFilters || hasActiveAnalysis) ? (
                  <>
                    <button
                      type="button"
                      className="w-full rounded-sm px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      onClick={(event) => {
                        event.preventDefault();
                        handleClearAll();
                      }}
                    >
                      Limpar tudo
                    </button>
                  </>
                ) : null}
              </div>

              <div className="rounded-lg border border-border/60 bg-background p-3">
                {groupByPanel}
              </div>

              <div className="rounded-lg border border-border/60 bg-background p-3">
                {favoritesPanel ?? (
                  <ModuleEmptyState
                    title={null}
                    description="Favoritos desativados."
                    compact
                    className="px-0 py-3"
                  />
                )}
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar favorito</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="favorite-name">Nome</Label>
            <Input
              id="favorite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Entradas em fevereiro"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) return;
                const next: FavoriteDefinition<TState> = {
                  id: crypto.randomUUID(),
                  name: trimmed,
                  state: snapshot,
                  createdAt: new Date().toISOString(),
                };
                persist([next, ...favorites]);
                setSaveOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customFilterOpen} onOpenChange={setCustomFilterOpen}>
        <DialogContent className="w-[min(96vw,68rem)]">
          <DialogHeader>
            <DialogTitle>Filtro personalizado</DialogTitle>
          </DialogHeader>
          {hasAdvancedFilters && allowAdvancedFilters ? (
            <AdvancedFilterBuilder
              key={customFilterOpen ? "open" : "closed"}
              searchView={searchView}
              value={pendingDomain}
              onChange={setPendingDomain}
              density="line"
              syncFromValue={false}
              allowedCombinators={allowedCombinators}
              valueSuggestions={valueSuggestions}
              className="max-h-[65vh] overflow-auto pr-1"
            />
          ) : (
            <div className="text-sm text-muted-foreground">Nenhum filtro configurado.</div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomFilterOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                onDomainChange(pendingDomain);
                setCustomFilterOpen(false);
              }}
              disabled={!hasAdvancedFilters || !allowAdvancedFilters}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
