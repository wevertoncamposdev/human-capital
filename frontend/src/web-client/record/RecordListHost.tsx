"use client";

import * as React from "react";
import { RefreshCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecordBrowserViewOption } from "@/components/record-browser/RecordBrowserViewSwitcher";
import type { SearchFacet } from "@/web-client/control-panel/SearchBar";
import { SearchBar } from "@/web-client/control-panel/SearchBar";
import { SearchPanelMenu } from "@/web-client/control-panel/SearchPanelMenu";
import { PageControlPanel } from "@/web-client/control-panel/PageControlPanel";
import { ViewSwitcher } from "@/web-client/control-panel/ViewSwitcher";
import type { RecordModuleDefinition, RecordQueryState } from "@/web-client/registry/types";
import {
  getModuleAction,
  getModuleCreateActionLabel,
  getModuleFieldLabel,
  getModuleGraphBuilderConfig,
  getModuleSearchPlaceholder,
  getModuleTotalLabel,
  isModuleViewEnabled,
} from "@/web-client/registry/module-utils";
import type { SearchViewDefinition } from "@/web-client/search/types";
import { getGraphBuilderGroupFields } from "@/web-client/views/GraphView";

export type RecordListHostProps<
  TState extends RecordQueryState,
  TFavoriteState extends Record<string, unknown>,
> = {
  moduleDefinition: RecordModuleDefinition<TState>;
  searchView?: SearchViewDefinition;
  state: TState;
  onStateChange: React.Dispatch<React.SetStateAction<TState>>;
  queryFacets: SearchFacet[];
  analysisFacets?: SearchFacet[];
  valueSuggestions?: (fieldName: string) => string[];
  favoriteSnapshot: TFavoriteState;
  onApplyFavorite?: (snapshot: TFavoriteState) => void;
  mapFavoriteToState?: (
    snapshot: TFavoriteState,
    previousState: TState,
  ) => Partial<TState>;
  isLoading?: boolean;
  onRefresh?: () => void;
  totalCount?: number;
  primaryActionSlot?: React.ReactNode;
  onCreate?: () => void;
  canCreate?: boolean;
  searchBarPlaceholder?: string;
  children: React.ReactNode;
  viewControls?: React.ReactNode;
  analysisSlot?: React.ReactNode;
  allowEmptyGroupBy?: boolean;
  groupByMode?: "single" | "multi";
  rightSlot?: React.ReactNode;
  hasActiveAnalysis?: boolean;
  onClearFilters?: () => void;
  onResetAnalysis?: () => void;
  onClearAll?: () => void;
};

const BASE_CONTROL_BUTTON_CLASS = "h-8 w-8 text-muted-foreground hover:text-foreground";

const FACET_TONE_PRIORITY: Record<NonNullable<SearchFacet["tone"]>, number> = {
  default: 0,
  group: 1,
  analysis: 2,
};

function buildViewOptions<TState extends RecordQueryState>(
  moduleDefinition: RecordModuleDefinition<TState>,
) {
  return moduleDefinition.views
    .filter((view) => isModuleViewEnabled(moduleDefinition, view))
    .map<RecordBrowserViewOption<string>>((view) => ({
      value: view.id,
      label: view.title,
      icon: view.icon,
    }));
}

export function RecordListHost<
  TState extends RecordQueryState,
  TFavoriteState extends Record<string, unknown>,
>({
  moduleDefinition,
  searchView,
  state,
  onStateChange,
  queryFacets,
  analysisFacets,
  valueSuggestions,
  favoriteSnapshot,
  onApplyFavorite,
  mapFavoriteToState,
  isLoading,
  onRefresh,
  totalCount,
  onCreate,
  canCreate = false,
  searchBarPlaceholder,
  children,
  viewControls,
  analysisSlot,
  allowEmptyGroupBy = false,
  groupByMode = "multi",
  rightSlot,
  primaryActionSlot,
  hasActiveAnalysis = false,
  onClearFilters,
  onResetAnalysis,
  onClearAll,
}: RecordListHostProps<TState, TFavoriteState>) {
  const resolvedSearchView = searchView ?? moduleDefinition.searchConfig;
  const viewOptions = React.useMemo(
    () => buildViewOptions(moduleDefinition),
    [moduleDefinition],
  );
  const createAction = React.useMemo(
    () => getModuleAction(moduleDefinition, "create"),
    [moduleDefinition],
  );
  const refreshAction = React.useMemo(
    () => getModuleAction(moduleDefinition, "refresh"),
    [moduleDefinition],
  );
  const resolvedSearchBarPlaceholder = React.useMemo(
    () => searchBarPlaceholder ?? getModuleSearchPlaceholder(moduleDefinition),
    [moduleDefinition, searchBarPlaceholder],
  );
  const resolvedCreateLabel = React.useMemo(
    () => getModuleCreateActionLabel(moduleDefinition),
    [moduleDefinition],
  );
  const resolvedTotalLabel = React.useMemo(
    () => getModuleTotalLabel(moduleDefinition),
    [moduleDefinition],
  );
  const activeView = React.useMemo(
    () => moduleDefinition.views.find((view) => view.id === state.view) ?? null,
    [moduleDefinition.views, state.view],
  );
  const searchGroupOptions = React.useMemo(
    () => resolvedSearchView.groupBy ?? [],
    [resolvedSearchView.groupBy],
  );
  const graphBuilder = React.useMemo(
    () =>
      activeView?.viewType === "graph"
        ? getModuleGraphBuilderConfig(moduleDefinition, activeView.id)
        : undefined,
    [activeView, moduleDefinition],
  );
  const contextualGroupConfig = React.useMemo(() => {
    if (activeView?.viewType === "graph" && graphBuilder) {
      const options = getGraphBuilderGroupFields(graphBuilder).map((field) => ({
        field: field.field,
        label: field.label,
      }));
      const graphState = state.graph as { groupBy?: string } | undefined;

      return {
        options,
        value: graphState?.groupBy ? [graphState.groupBy] : [],
        mode: "single" as const,
        allowEmpty: false,
        onChange: (next: string[]) => {
          const nextGroupBy = next[0] ?? graphBuilder.defaultState.groupBy;
          onStateChange((previous) => ({
            ...previous,
            graph: {
              ...(previous.graph as Record<string, unknown>),
              groupBy: nextGroupBy,
            } as unknown,
            pageIndex: 0,
          }));
        },
      };
    }

    if (activeView?.viewType === "kanban" || activeView?.viewType === "gantt") {
      const configuredFields = activeView.params?.groupByFields ?? [];
      const defaultField =
        activeView.viewType === "kanban"
          ? activeView.params?.defaultGroupByField ?? activeView.params?.columnField
          : activeView.params?.defaultGroupByField;
      const options = (configuredFields.length ? configuredFields : searchGroupOptions).map(
        (fieldOrOption) => {
          if (typeof fieldOrOption !== "string") {
            return fieldOrOption;
          }

          const existingOption = searchGroupOptions.find((option) => option.field === fieldOrOption);
          if (existingOption) {
            return existingOption;
          }

          return {
            field: fieldOrOption,
            label: getModuleFieldLabel(moduleDefinition, fieldOrOption, fieldOrOption),
          };
        },
      );

      return {
        options,
        value:
          state.groupBy?.length
            ? state.groupBy
            : defaultField
              ? [defaultField]
              : [],
        mode: "single" as const,
        allowEmpty: allowEmptyGroupBy,
        onChange: (next: string[]) =>
          onStateChange((previous) => ({
            ...previous,
            groupBy: next,
            pageIndex: 0,
          })),
      };
    }

    if (searchGroupOptions.length) {
      return {
        options: searchGroupOptions,
        value: state.groupBy ?? [],
        mode: groupByMode,
        allowEmpty: allowEmptyGroupBy,
        onChange: (next: string[]) =>
          onStateChange((previous) => ({
            ...previous,
            groupBy: next,
            pageIndex: 0,
          })),
      };
    }

    return null;
  }, [
    activeView,
    allowEmptyGroupBy,
    graphBuilder,
    groupByMode,
    moduleDefinition,
    onStateChange,
    searchGroupOptions,
    state.graph,
    state.groupBy,
  ]);
  const hasMultiView = viewOptions.length > 1;
  const mergedFacets = React.useMemo(
    () =>
      [...queryFacets, ...(analysisFacets ?? [])]
        .map((facet, index) => ({ facet, index }))
        .sort((left, right) => {
          const leftPriority = FACET_TONE_PRIORITY[left.facet.tone ?? "default"] ?? 99;
          const rightPriority = FACET_TONE_PRIORITY[right.facet.tone ?? "default"] ?? 99;

          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }

          return left.index - right.index;
        })
        .map(({ facet }) => facet),
    [analysisFacets, queryFacets],
  );
  const hasActiveFilters = Boolean(state.domain);
  const panelIsActive = hasActiveFilters || hasActiveAnalysis;

  return (
    <div className="flex flex-col gap-4">
      <PageControlPanel
        primaryActionSlot={
          primaryActionSlot ??
          (canCreate && onCreate ? (
            <Button type="button" size="sm" className="h-8 gap-2" onClick={onCreate}>
              {createAction?.icon}
              {resolvedCreateLabel}
            </Button>
          ) : undefined)
        }
        searchSlot={
          <SearchBar
            value={state.searchText ?? ""}
            onChange={(next) =>
              onStateChange((previous) => ({ ...previous, searchText: next, pageIndex: 0 }))
            }
            placeholder={resolvedSearchBarPlaceholder}
            facets={mergedFacets}
            rightSlot={
              <div className="flex items-center gap-0.5">
                {typeof totalCount === "number" ? (
                  <div className="whitespace-nowrap px-1 text-[11px] text-muted-foreground">
                    {resolvedTotalLabel}:{" "}
                    <span className="font-mono tabular-nums text-foreground">
                      {totalCount.toLocaleString("pt-BR")}
                    </span>
                  </div>
                ) : null}
                {onRefresh ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={BASE_CONTROL_BUTTON_CLASS}
                    title={refreshAction?.label ?? "Atualizar"}
                    aria-label={refreshAction?.label ?? "Atualizar"}
                    onClick={onRefresh}
                    disabled={isLoading}
                  >
                    {refreshAction?.icon ?? <RefreshCcw className="size-4" />}
                  </Button>
                ) : null}
                {rightSlot}
                <SearchPanelMenu<TFavoriteState>
                  actionId={moduleDefinition.favoriteKey}
                  variant="compact"
                  allowEmptyGroupBy={contextualGroupConfig?.allowEmpty ?? allowEmptyGroupBy}
                  groupByMode={contextualGroupConfig?.mode ?? groupByMode}
                  groupByOptions={contextualGroupConfig?.options}
                  analysisSlot={analysisSlot}
                  valueSuggestions={valueSuggestions}
                  onClearAll={
                    onClearAll ??
                    (() => {
                      onStateChange((previous) => ({
                        ...previous,
                        domain: null,
                        groupBy: [],
                        pageIndex: 0,
                      }));
                    })
                  }
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`relative ${BASE_CONTROL_BUTTON_CLASS}`}
                      title="Filtros"
                      aria-label="Filtros"
                    >
                      <SlidersHorizontal className="size-4" />
                      {panelIsActive ? (
                        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
                      ) : null}
                    </Button>
                  }
                  searchView={resolvedSearchView}
                  hasActiveFilters={hasActiveFilters}
                  hasActiveAnalysis={hasActiveAnalysis}
                  onClearFilters={
                    onClearFilters ??
                    (() =>
                      onStateChange((previous) => ({
                        ...previous,
                        domain: null,
                        pageIndex: 0,
                      })))
                  }
                  onResetAnalysis={
                    onResetAnalysis ??
                    (() =>
                      onStateChange((previous) => ({
                        ...previous,
                        groupBy: [],
                        pageIndex: 0,
                      })))
                  }
                  domain={state.domain}
                  onDomainChange={(domain) =>
                    onStateChange((previous) => ({ ...previous, domain, pageIndex: 0 }))
                  }
                  groupBy={contextualGroupConfig?.value ?? []}
                  onGroupByChange={
                    contextualGroupConfig?.onChange ??
                    ((groupBy) =>
                      onStateChange((previous) => ({
                        ...previous,
                        groupBy,
                        pageIndex: 0,
                      })))
                  }
                  snapshot={favoriteSnapshot}
                  onApplyFavorite={(next) => {
                    onStateChange((previous) => ({
                      ...previous,
                      ...(
                        mapFavoriteToState
                          ? mapFavoriteToState(next, previous)
                          : (next as unknown as Partial<TState>)
                      ),
                      pageIndex: 0,
                    }));
                    onApplyFavorite?.(next);
                  }}
                />
              </div>
            }
          />
        }
        viewSwitcherSlot={
          hasMultiView ? (
            <ViewSwitcher
              value={state.view}
              options={viewOptions}
              onChange={(next) =>
                onStateChange((previous) => ({ ...previous, view: next, pageIndex: 0 }))
              }
            />
          ) : undefined
        }
        viewControlsSlot={viewControls}
      />

      {children}
    </div>
  );
}

export function EntityModuleShell<
  TState extends RecordQueryState,
  TFavoriteState extends Record<string, unknown>,
>(props: RecordListHostProps<TState, TFavoriteState>) {
  return <RecordListHost {...props} />;
}
