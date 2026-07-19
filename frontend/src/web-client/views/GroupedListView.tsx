"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ListView } from "@/web-client/views/ListView";

function defaultGroupLabel(_field: string, value: unknown) {
  const label = String(value ?? "").trim();
  return label ? label : "Sem valor";
}

type GroupNode<TData> = {
  key: string;
  field: string;
  value: unknown;
  label: string;
  count: number;
  depth: number;
  children: GroupNode<TData>[] | null;
  items: TData[] | null;
};

function buildGroupNodes<TData>({
  items,
  fields,
  depth,
  parentKey,
  resolveGroupLabel,
}: {
  items: TData[];
  fields: string[];
  depth: number;
  parentKey: string;
  resolveGroupLabel: (field: string, value: unknown) => string;
}): GroupNode<TData>[] {
  if (!fields.length) return [];

  const field = fields[0]!;
  const map = new Map<string, { key: string; value: unknown; label: string; items: TData[] }>();

  items.forEach((item) => {
    const raw = item as Record<string, unknown>;
    const value = raw[field];
    const label = resolveGroupLabel(field, value);
    const rawKey = `${field}:${String(value ?? "").trim()}`;
    const key = parentKey ? `${parentKey}|${rawKey}` : rawKey;

    const current = map.get(key) ?? { key, value, label, items: [] as TData[] };
    current.items.push(item);
    map.set(key, current);
  });

  const nextFields = fields.slice(1);
  return Array.from(map.values())
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((group) => {
      const children =
        nextFields.length > 0
          ? buildGroupNodes<TData>({
              items: group.items,
              fields: nextFields,
              depth: depth + 1,
              parentKey: group.key,
              resolveGroupLabel,
            })
          : null;

      return {
        key: group.key,
        field,
        value: group.value,
        label: group.label,
        count: group.items.length,
        depth,
        children,
        items: nextFields.length ? null : group.items,
      };
    });
}

export function GroupedListView<TData>({
  data,
  columns,
  groupByFields,
  resolveGroupLabel = defaultGroupLabel,
  getRowId,
  onRowClick,
}: {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  groupByFields?: string[] | null;
  resolveGroupLabel?: (field: string, groupValue: unknown) => string;
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
}) {
  const fields = React.useMemo(() => groupByFields?.filter(Boolean) ?? [], [groupByFields]);

  const groups = React.useMemo(() => {
    if (!fields.length) return null;
    return buildGroupNodes<TData>({
      items: data,
      fields,
      depth: 0,
      parentKey: "",
      resolveGroupLabel,
    });
  }, [data, fields, resolveGroupLabel]);

  const [openByKey, setOpenByKey] = React.useState<Record<string, boolean>>({});
  const isOpen = React.useCallback((key: string) => openByKey[key] ?? true, [openByKey]);
  const toggle = React.useCallback((key: string) => {
    setOpenByKey((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }, []);

  if (!groups) {
    return (
      <ListView
        data={data}
        columns={columns}
        getRowId={getRowId}
        onRowClick={onRowClick}
      />
    );
  }

  const renderNode = (node: GroupNode<TData>) => {
    const open = isOpen(node.key);
    const hasChildren = Boolean(node.children?.length);
    const hasItems = Boolean(node.items?.length);

    return (
      <div key={node.key} className="space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-sm px-1 py-1 text-left hover:bg-muted/20"
          onClick={() => toggle(node.key)}
          style={{ paddingLeft: 4 + node.depth * 14 }}
        >
          <div className="flex min-w-0 items-center gap-1">
            {open ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 truncate text-xs font-semibold text-foreground">
              {node.label}
            </div>
          </div>
          <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {node.count}
          </div>
        </button>

        {open ? (
          hasChildren ? (
            <div className="space-y-3">{node.children!.map(renderNode)}</div>
          ) : hasItems ? (
            <ListView
              data={node.items!}
              columns={columns}
              getRowId={getRowId}
              onRowClick={onRowClick}
            />
          ) : null
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {groups.map(renderNode)}
    </div>
  );
}
