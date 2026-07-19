"use client";

import * as React from "react";

type UseRelatedAuditEntityIdsArgs<TMap extends Record<string, string[]>> = {
  enabled?: boolean;
  emptyValue: TMap;
  load: () => Promise<TMap>;
};

export function useRelatedAuditEntityIds<TMap extends Record<string, string[]>>({
  enabled = true,
  emptyValue,
  load,
}: UseRelatedAuditEntityIdsArgs<TMap>) {
  const [value, setValue] = React.useState<TMap>(emptyValue);

  React.useEffect(() => {
    if (!enabled) {
      setValue(emptyValue);
      return;
    }

    let cancelled = false;

    void load()
      .then((nextValue) => {
        if (!cancelled) {
          setValue(nextValue);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValue(emptyValue);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [emptyValue, enabled, load]);

  return value;
}
