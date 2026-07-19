"use client";

import * as React from "react";
import type {
  RecordModuleDefinition,
  RecordQueryState,
} from "@/web-client/registry/types";
import { usePersistedUrlState } from "@/web-client/screen/usePersistedUrlState";

export function useModuleQueryState<TState extends RecordQueryState>({
  moduleDefinition,
  trackedKeys,
  parse,
  serialize,
  equals,
}: {
  moduleDefinition: RecordModuleDefinition<TState>;
  trackedKeys: string[];
  parse: (params: URLSearchParams) => TState;
  serialize: (state: TState) => Record<string, string | undefined>;
  equals?: (a: TState, b: TState) => boolean;
}) {
  const parseWithDefaults = React.useCallback(
    (params: URLSearchParams) =>
      ({
        ...moduleDefinition.defaultQueryState,
        ...parse(params),
      }) as TState,
    [moduleDefinition.defaultQueryState, parse],
  );

  return usePersistedUrlState<TState>({
    storageKey: moduleDefinition.actionKey,
    trackedKeys,
    parse: parseWithDefaults,
    serialize,
    equals,
  });
}
