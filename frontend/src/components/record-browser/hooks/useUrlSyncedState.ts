"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function shallowEqualRecord(a: Record<string, unknown>, b: Record<string, unknown>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function useUrlSyncedState<TState extends Record<string, unknown>>({
  parse,
  serialize,
  equals = shallowEqualRecord,
}: {
  parse: (params: URLSearchParams) => TState;
  serialize: (state: TState) => Record<string, string | undefined>;
  equals?: (a: TState, b: TState) => boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mountedRef = React.useRef(false);

  const parsed = React.useMemo(() => parse(new URLSearchParams(searchParams.toString())), [
    parse,
    searchParams,
  ]);

  const [state, setState] = React.useState<TState>(parsed);

  React.useEffect(() => {
    setState((prev) => (equals(prev, parsed) ? prev : parsed));
  }, [equals, parsed]);

  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    const serialized = serialize(state);

    Object.entries(serialized).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        nextParams.delete(key);
        return;
      }
      nextParams.set(key, value);
    });

    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, serialize, state]);

  return [state, setState] as const;
}

