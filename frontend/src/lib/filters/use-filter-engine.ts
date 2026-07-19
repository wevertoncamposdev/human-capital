"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FilterSchema } from "./types";
import {
  areFilterValuesEqual,
  buildSearchParamsFromFilters,
  parseFiltersFromSearchParams,
} from "./codec";

export function useFilterEngine<TValues extends Record<string, unknown>>({
  schema,
  defaults,
  syncToUrl = true,
}: {
  schema: FilterSchema<TValues>;
  defaults: TValues;
  syncToUrl?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initial = React.useMemo(() => {
    if (!syncToUrl) return defaults;
    return parseFiltersFromSearchParams(schema, new URLSearchParams(searchParams.toString()), defaults);
  }, [defaults, schema, searchParams, syncToUrl]);

  const [draft, setDraft] = React.useState<TValues>(initial);
  const [applied, setApplied] = React.useState<TValues>(initial);

  const updateUrl = React.useCallback(
    (nextApplied: TValues) => {
      if (!syncToUrl) return;
      const params = buildSearchParamsFromFilters(schema, nextApplied, defaults);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaults, pathname, router, schema, syncToUrl],
  );

  const apply = React.useCallback(() => {
    setApplied(draft);
    updateUrl(draft);
    return draft;
  }, [draft, updateUrl]);

  const clear = React.useCallback(() => {
    setDraft(defaults);
    setApplied(defaults);
    updateUrl(defaults);
    return defaults;
  }, [defaults, updateUrl]);

  const setField = React.useCallback(
    <K extends keyof TValues & string>(key: K, value: TValues[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const hasChanges = React.useMemo(
    () => !areFilterValuesEqual(draft, applied),
    [applied, draft],
  );

  React.useEffect(() => {
    if (!syncToUrl) return;
    const next = parseFiltersFromSearchParams(
      schema,
      new URLSearchParams(searchParams.toString()),
      defaults,
    );
    if (areFilterValuesEqual(next, applied)) return;
    setApplied(next);
    setDraft(next);
  }, [applied, defaults, schema, searchParams, syncToUrl]);

  return {
    draft,
    applied,
    setDraft,
    setField,
    apply,
    clear,
    hasChanges,
  };
}
