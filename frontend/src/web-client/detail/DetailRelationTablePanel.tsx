"use client";

import * as React from "react";
import type { ColumnDef, ColumnPinningState } from "@tanstack/react-table";
import { matchesDomainRecord } from "@/web-client/domain/evaluate";
import type { Domain } from "@/web-client/domain/types";
import type { SearchFieldDefinition } from "@/web-client/search/types";
import { RelationListHost } from "@/web-client/relation/RelationListHost";
import { TableView } from "@/web-client/views/TableView";

type DetailRelationTablePanelProps<TData> = {
  title?: string;
  subtitle?: string;
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData, index: number) => string;
  searchPlaceholder?: string;
  filterRow?: (row: TData, query: string) => boolean;
  onAdd?: () => void;
  addHref?: string;
  addLabel?: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  tableMinWidthClassName?: string;
  onRowClick?: (row: TData) => void;
  tableInitialColumnPinning?: ColumnPinningState;
  filterFields?: SearchFieldDefinition[];
  buildSearchRecord?: (row: TData) => Record<string, unknown>;
  searchActionId?: string;
};

export function DetailRelationTablePanel<TData>({
  title,
  subtitle,
  data,
  columns,
  getRowId,
  searchPlaceholder = "Pesquisar registros",
  filterRow,
  onAdd,
  addHref,
  addLabel = "Novo registro",
  loading = false,
  error = null,
  emptyMessage = "Nenhum registro encontrado.",
  tableMinWidthClassName = "min-w-[1080px]",
  onRowClick,
  tableInitialColumnPinning,
  filterFields,
  buildSearchRecord,
  searchActionId,
}: DetailRelationTablePanelProps<TData>) {
  const [query, setQuery] = React.useState("");
  const [domain, setDomain] = React.useState<Domain>(null);
  const [groupBy, setGroupBy] = React.useState<string[]>([]);

  const filteredRows = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.filter((row) => {
      const matchesText = normalizedQuery
        ? filterRow
          ? filterRow(row, normalizedQuery)
          : true
        : true;

      if (!matchesText) return false;
      if (!filterFields?.length || !buildSearchRecord) return true;

      const record = buildSearchRecord(row);
      return matchesDomainRecord(
        record,
        domain,
        (current, field) => current[field as keyof typeof current],
      );
    });
  }, [buildSearchRecord, data, domain, filterFields?.length, filterRow, query]);

  return (
    <RelationListHost
      title={title}
      subtitle={subtitle}
      data={data}
      searchText={query}
      onSearchTextChange={setQuery}
      domain={domain}
      onDomainChange={setDomain}
      groupBy={groupBy}
      onGroupByChange={setGroupBy}
      filterFields={filterFields}
      buildSearchRecord={buildSearchRecord}
      searchActionId={searchActionId}
      searchPlaceholder={searchPlaceholder}
      filteredCount={filteredRows.length}
      addHref={addHref}
      addLabel={addLabel}
      onAdd={onAdd}
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <TableView
        data={filteredRows}
        columns={columns}
        getRowId={getRowId}
        onRowClick={onRowClick}
        className="bg-transparent"
        minWidthClassName={tableMinWidthClassName}
        initialColumnPinning={tableInitialColumnPinning}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : null}

      {!loading && !error && filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : null}
    </RelationListHost>
  );
}
