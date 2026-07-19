"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/auth-context";
import {
  createPersonFinancialEntry,
  deletePersonFinancialEntry,
  getPersonFinancialEntries,
  updatePersonFinancialEntry,
} from "@/modules/people/api";
import type { PersonFinancialEntry } from "@/modules/people/shared/domain/types";

type UsePeopleFinancialResult = {
  entries: PersonFinancialEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (
    payload: Omit<PersonFinancialEntry, "id" | "personId">,
  ) => Promise<PersonFinancialEntry | null>;
  update: (
    entryId: string,
    payload: Partial<Omit<PersonFinancialEntry, "id" | "personId">>,
  ) => Promise<PersonFinancialEntry | null>;
  remove: (entryId: string) => Promise<void>;
};

export function usePeopleFinancial(
  personId: string,
  options?: { enabled?: boolean },
): UsePeopleFinancialResult {
  const { token } = useAuth();
  const enabled = options?.enabled ?? true;
  const [entries, setEntries] = React.useState<PersonFinancialEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPersonFinancialEntries(token, personId);
      setEntries(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar financeiro.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token, personId]);

  React.useEffect(() => {
    if (!token || !enabled) return;
    void refresh();
  }, [token, enabled, refresh]);

  const create = React.useCallback(
    async (payload: Omit<PersonFinancialEntry, "id" | "personId">) => {
      if (!token) return null;
      const created = await createPersonFinancialEntry(token, personId, payload);
      setEntries((previous) => [created, ...previous]);
      return created;
    },
    [personId, token],
  );

  const update = React.useCallback(
    async (
      entryId: string,
      payload: Partial<Omit<PersonFinancialEntry, "id" | "personId">>,
    ) => {
      if (!token) return null;
      const updated = await updatePersonFinancialEntry(token, personId, entryId, payload);
      setEntries((previous) =>
        previous.map((item) => (item.id === entryId ? updated : item)),
      );
      return updated;
    },
    [personId, token],
  );

  const remove = React.useCallback(
    async (entryId: string) => {
      if (!token) return;
      await deletePersonFinancialEntry(token, personId, entryId);
      setEntries((previous) => previous.filter((item) => item.id !== entryId));
    },
    [personId, token],
  );

  return { entries, isLoading, error, refresh, create, update, remove };
}
