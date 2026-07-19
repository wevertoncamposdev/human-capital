"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SearchBar } from "@/web-client/control-panel/SearchBar";
import { SearchPanelMenu } from "@/web-client/control-panel/SearchPanelMenu";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import type { Domain } from "@/web-client/domain/types";
import type {
  SearchFieldDefinition,
  SearchViewDefinition,
} from "@/web-client/search/types";

type RelationListHostProps<TData> = {
  title?: string;
  subtitle?: string;
  data: TData[];
  searchText: string;
  onSearchTextChange: (next: string) => void;
  domain: Domain;
  onDomainChange: (next: Domain) => void;
  groupBy?: string[];
  onGroupByChange?: (next: string[]) => void;
  filterFields?: SearchFieldDefinition[];
  buildSearchRecord?: (row: TData) => Record<string, unknown>;
  searchActionId?: string;
  searchPlaceholder?: string;
  filteredCount: number;
  addHref?: string;
  addLabel?: string;
  onAdd?: () => void;
  children: React.ReactNode;
};

export function RelationListHost<TData>({
  title,
  subtitle,
  data,
  searchText,
  onSearchTextChange,
  domain,
  onDomainChange,
  groupBy = [],
  onGroupByChange,
  filterFields,
  buildSearchRecord,
  searchActionId,
  searchPlaceholder = "Pesquisar registros",
  filteredCount,
  addHref,
  addLabel = "Novo registro",
  onAdd,
  children,
}: RelationListHostProps<TData>) {
  const resolvedSearchView = React.useMemo<SearchViewDefinition | null>(() => {
    if (!filterFields?.length) return null;
    return {
      id: searchActionId ?? `detail-relation:${title ?? addLabel ?? "records"}`,
      model: "detail.relation",
      fields: filterFields,
      features: {
        groupBy: false,
      },
    };
  }, [addLabel, filterFields, searchActionId, title]);

  const removeDomainCondition = React.useCallback((index: number) => {
    onDomainChange(removeConditionAtIndex(domain, "and", index));
  }, [domain, onDomainChange]);

  const queryFacets = React.useMemo(
    () =>
      resolvedSearchView
        ? buildQueryFacets({
            domain,
            groupBy,
            searchView: resolvedSearchView,
            onClearGroupBy: () => onGroupByChange?.([]),
            onClearDomain: () => onDomainChange(null),
            onRemoveDomainCondition: removeDomainCondition,
          })
        : [],
    [domain, groupBy, onDomainChange, onGroupByChange, removeDomainCondition, resolvedSearchView],
  );

  const valueSuggestions = React.useCallback(
    (fieldName: string) => {
      if (!resolvedSearchView || !buildSearchRecord) return [];
      const values = new Set<string>();
      data.forEach((row) => {
        const value = buildSearchRecord(row)[fieldName];
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            const normalized = String(entry ?? "").trim();
            if (normalized) values.add(normalized);
          });
          return;
        }
        const normalized = String(value ?? "").trim();
        if (normalized) values.add(normalized);
      });
      return Array.from(values).sort((left, right) => left.localeCompare(right));
    },
    [buildSearchRecord, data, resolvedSearchView],
  );

  const filteredCountLabel = filteredCount.toLocaleString("pt-BR");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[280px] flex-1">
          <SearchBar
            value={searchText}
            onChange={onSearchTextChange}
            placeholder={searchPlaceholder}
            facets={queryFacets}
            rightSlot={
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {filteredCountLabel}
                </span>
                {resolvedSearchView ? (
                  <SearchPanelMenu
                    actionId={resolvedSearchView.id}
                    searchView={resolvedSearchView}
                    domain={domain}
                    onDomainChange={onDomainChange}
                    groupBy={groupBy}
                    onGroupByChange={onGroupByChange ?? (() => undefined)}
                    groupByOptions={[]}
                    snapshot={{ searchText, domain, groupBy }}
                    valueSuggestions={valueSuggestions}
                    onApplyFavorite={(snapshot) => {
                      onSearchTextChange(String(snapshot.searchText ?? ""));
                      onDomainChange((snapshot.domain as Domain) ?? null);
                      onGroupByChange?.(
                        Array.isArray(snapshot.groupBy)
                          ? (snapshot.groupBy as string[])
                          : [],
                      );
                    }}
                    variant="compact"
                  />
                ) : null}
              </div>
            }
          />
        </div>
        {addHref ? (
          <Link
            href={addHref}
            className="inline-flex h-10 shrink-0 items-center justify-end gap-1 border-b border-transparent px-0 text-base font-medium text-foreground transition hover:text-primary"
          >
            <span>{addLabel}</span>
            <ChevronRight className="size-4" />
          </Link>
        ) : onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-10 shrink-0 items-center justify-end gap-1 border-b border-transparent px-0 text-base font-medium text-foreground transition hover:text-primary"
          >
            <span>{addLabel}</span>
            <ChevronRight className="size-4" />
          </button>
        ) : null}
      </div>

      {title || subtitle ? (
        <div className="sr-only">
          {title ? <h3>{title}</h3> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}
