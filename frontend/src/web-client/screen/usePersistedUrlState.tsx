"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepEqualValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!deepEqualValue(left[index], right[index])) return false;
    }
    return true;
  }

  if (left instanceof Date || right instanceof Date) {
    if (!(left instanceof Date) || !(right instanceof Date)) return false;
    return left.getTime() === right.getTime();
  }

  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      if (!deepEqualValue(left[key], right[key])) return false;
    }
    return true;
  }

  return false;
}

function deepEqualRecord(a: Record<string, unknown>, b: Record<string, unknown>) {
  return deepEqualValue(a, b);
}

function safeJsonParse(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function usePersistedUrlState<TState extends Record<string, unknown>>({
  storageKey,
  trackedKeys,
  parse,
  serialize,
  equals = deepEqualRecord as unknown as (a: TState, b: TState) => boolean,
}: {
  storageKey: string;
  trackedKeys: string[];
  parse: (params: URLSearchParams) => TState;
  serialize: (state: TState) => Record<string, string | undefined>;
  equals?: (a: TState, b: TState) => boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mountedRef = React.useRef(false);
  const equalsRef = React.useRef(equals);
  const pendingQueryRef = React.useRef<string | null>(null);
  const trackedKeysKey = trackedKeys.join("\u0000");
  const currentQuery = searchParams.toString();
  const lastUrlQueryRef = React.useRef(currentQuery);

  React.useEffect(() => {
    equalsRef.current = equals;
  }, [equals]);

  const isEqual = React.useCallback(
    (left: TState, right: TState) => equalsRef.current(left, right),
    [],
  );

  const parsedFromUrl = React.useMemo(
    () => parse(new URLSearchParams(currentQuery)),
    [currentQuery, parse],
  );

  const [state, setState] = React.useState<TState>(parsedFromUrl);
  const [isReadyToWrite, setIsReadyToWrite] = React.useState(false);

  React.useEffect(() => {
    if (currentQuery === lastUrlQueryRef.current) {
      return;
    }

    lastUrlQueryRef.current = currentQuery;

    if (pendingQueryRef.current !== null && currentQuery === pendingQueryRef.current) {
      pendingQueryRef.current = null;
      return;
    }

    pendingQueryRef.current = null;
    setState((prev) => (isEqual(prev, parsedFromUrl) ? prev : parsedFromUrl));
  }, [currentQuery, isEqual, parsedFromUrl]);

  React.useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const params = new URLSearchParams(currentQuery);
    const hasUrlState = trackedKeys.some((key) => params.has(key));
    if (!hasUrlState) {
      const raw =
        typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      const parsed = safeJsonParse(raw);
      if (parsed && typeof parsed === "object") {
        const merged = { ...parsedFromUrl, ...(parsed as Record<string, unknown>) } as TState;
        setState((prev) => (isEqual(prev, merged) ? prev : merged));
      }
    }

    setIsReadyToWrite(true);
  }, [currentQuery, isEqual, parsedFromUrl, storageKey, trackedKeys, trackedKeysKey]);

  React.useEffect(() => {
    if (!isReadyToWrite) return;

    const nextParams = new URLSearchParams(currentQuery);
    const serialized = serialize(state);
    const trackedKeySet = new Set(trackedKeys);

    trackedKeySet.forEach((key) => {
      const value = serialized[key];
      if (value === undefined || value === null || value === "") {
        nextParams.delete(key);
      }
    });

    Object.entries(serialized).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        nextParams.delete(key);
        return;
      }
      nextParams.set(key, value);
    });

    const nextQuery = nextParams.toString();
    if (nextQuery !== currentQuery) {
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      pendingQueryRef.current = nextQuery;
      router.replace(nextUrl, { scroll: false });
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // ignore quota errors
      }
    }
  }, [currentQuery, isReadyToWrite, pathname, router, serialize, state, storageKey, trackedKeys, trackedKeysKey]);

  return [state, setState] as const;
}
