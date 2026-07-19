"use client";

import * as React from "react";
import type { DataProvider } from "@/web-client/data-provider/types";
import type {
  AuditFeedConfig,
  RecordQueryAdapter,
} from "@/web-client/registry/types";
import type {
  DetailAuditFeedItem,
  DetailAuditLog,
  DetailAuditFeedState,
} from "@/web-client/detail/audit-types";

function sortAuditLogs(
  logs: DetailAuditFeedItem[],
  sort:
    | AuditFeedConfig<Record<string, unknown>>["sort"]
    | undefined,
) {
  const [firstSort] = sort ?? [];
  if (!firstSort || firstSort.field !== "createdAt") {
    return [...logs].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  const factor = firstSort.direction === "asc" ? 1 : -1;
  return [...logs].sort((left, right) => {
    const leftValue = new Date(left.createdAt).getTime();
    const rightValue = new Date(right.createdAt).getTime();
    return leftValue === rightValue ? 0 : leftValue > rightValue ? factor : -factor;
  });
}

function resolvePrimaryEntityId<TContext extends Record<string, unknown>>(
  auditConfig: AuditFeedConfig<TContext> | undefined,
  context: TContext,
) {
  const entityId = auditConfig?.primaryEntity.resolveEntityId?.(context);
  return typeof entityId === "string" && entityId.trim() ? entityId.trim() : "";
}

function normalizeResolvedEntityIds(ids: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      ids
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function buildAuditRequestKey<TContext extends Record<string, unknown>>(
  auditConfig: AuditFeedConfig<TContext> | undefined,
  context: TContext,
) {
  if (!auditConfig) return "";

  const sources = [auditConfig.primaryEntity, ...(auditConfig.relatedEntities ?? [])];
  const primaryEntityId = resolvePrimaryEntityId(auditConfig, context);
  const resolvedFilters =
    typeof auditConfig.filters === "function"
      ? auditConfig.filters(context)
      : (auditConfig.filters ?? {});
  return JSON.stringify(
    {
      primaryEntityId,
      sources: sources.map((source) => ({
        key: source.key,
        entity: source.entity,
        ids: normalizeResolvedEntityIds([
          source.resolveEntityId?.(context),
          ...(source.resolveEntityIds?.(context) ?? []),
        ]),
      })),
      filters: resolvedFilters,
    },
  );
}

function bindValueFormatters<TContext extends Record<string, unknown>>(
  source: AuditFeedConfig<TContext>["primaryEntity"],
  context: TContext,
) {
  const formatters = source.valueFormatters;
  if (!formatters) return undefined;

  return Object.fromEntries(
    Object.entries(formatters).map(([field, formatter]) => [
      field,
      (value: unknown) =>
        formatter(value, {
          field,
          entity: source.entity,
          sourceKey: source.key,
          sourceLabel: source.label,
          context,
        }),
    ]),
  );
}

function buildSourceMap<TContext extends Record<string, unknown>>(
  auditConfig: AuditFeedConfig<TContext> | undefined,
  context: TContext,
) {
  const sourceMap = new Map<
    string,
    {
      key: string;
      label: string;
      fieldLabels?: Record<string, string>;
      valueFormatters?: Record<string, (value: unknown) => string>;
    }
  >();

  if (!auditConfig) return sourceMap;

  [auditConfig.primaryEntity, ...(auditConfig.relatedEntities ?? [])].forEach(
    (source) => {
      sourceMap.set(source.entity, {
        key: source.key,
        label: source.label,
        fieldLabels: source.fieldLabels,
        valueFormatters: bindValueFormatters(source, context),
      });
    },
  );

  return sourceMap;
}

type UseDetailAuditFeedArgs<TContext extends Record<string, unknown>> = {
  dataProvider?: DataProvider;
  auditAdapter?: RecordQueryAdapter;
  auditConfig?: AuditFeedConfig<TContext>;
  context: TContext;
  enabled?: boolean;
};

export function useDetailAuditFeed<TContext extends Record<string, unknown>>({
  dataProvider,
  auditAdapter,
  auditConfig,
  context,
  enabled = true,
}: UseDetailAuditFeedArgs<TContext>): DetailAuditFeedState {
  const [rawLogs, setRawLogs] = React.useState<DetailAuditLog[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const contextRef = React.useRef(context);

  React.useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const requestKey = React.useMemo(
    () => buildAuditRequestKey(auditConfig, context),
    [auditConfig, context],
  );
  const sourceMap = React.useMemo(
    () => {
      // Rebind audit formatters only when the audit request identity changes.
      void requestKey;
      return buildSourceMap(auditConfig, contextRef.current);
    },
    [auditConfig, requestKey],
  );
  const requestState = React.useMemo(() => {
    if (!requestKey) {
      return {
        entityId: "",
        sourceContext: [] as Array<{
          key: string;
          entity: string;
          ids: string[];
        }>,
        resolvedFilters: {} as Record<string, unknown>,
      };
    }

    const parsed = JSON.parse(requestKey) as {
      primaryEntityId?: string;
      sources?: Array<{
        key: string;
        entity: string;
        ids: string[];
      }>;
      filters?: Record<string, unknown>;
    };

    return {
      entityId: parsed.primaryEntityId ?? "",
      sourceContext: parsed.sources ?? [],
      resolvedFilters: parsed.filters ?? {},
    };
  }, [requestKey]);
  const pageSize = React.useMemo(
    () =>
      auditConfig?.pagination?.limit ??
      auditConfig?.pagination?.pageSize ??
      120,
    [auditConfig],
  );
  const logs = React.useMemo(() => {
    const mappedLogs = rawLogs.map<DetailAuditFeedItem>((log) => {
      const source = sourceMap.get(log.entity);
      return {
        ...log,
        sourceKey: source?.key ?? log.entity,
        sourceLabel: source?.label ?? log.entity,
        fieldLabels: source?.fieldLabels,
        valueFormatters: source?.valueFormatters,
      };
    });

    const transformedLogs = auditConfig?.transform
      ? (auditConfig.transform(mappedLogs) as DetailAuditFeedItem[])
      : mappedLogs;

    return sortAuditLogs(transformedLogs, auditConfig?.sort);
  }, [auditConfig, rawLogs, sourceMap]);

  const load = React.useCallback(async () => {
    if (
      !dataProvider ||
      !auditAdapter ||
      !auditConfig ||
      !enabled ||
      (!requestState.entityId && requestState.sourceContext.length === 0)
    ) {
      setRawLogs([]);
      setError(null);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await dataProvider.search<DetailAuditLog>(auditAdapter.model, {
        pagination: { pageIndex: 0, pageSize },
        context: {
          entityId: requestState.entityId,
          sourceContext: requestState.sourceContext,
          ...requestState.resolvedFilters,
        },
      });

      setRawLogs(response.data);
      setTotalCount(response.pagination?.total ?? response.data.length);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar auditoria.";

      setRawLogs([]);
      setError(message);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    auditAdapter,
    auditConfig,
    dataProvider,
    enabled,
    pageSize,
    requestState,
  ]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return React.useMemo(
    () => ({
      logs,
      loading,
      error,
      totalCount,
      reload: load,
    }),
    [error, load, loading, logs, totalCount],
  );
}
